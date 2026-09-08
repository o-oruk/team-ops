// Emails a teammate when they're assigned a task. Called from the dashboard client
// (src/hooks/useTasks.ts) right after a task/task_assignees insert succeeds — best-effort, so a
// mail failure here never blocks the assignment itself.
//
// Requires these Edge Function secrets (Project Settings -> Edge Functions -> Secrets):
//   SMTP_HOSTNAME  e.g. smtp.gmail.com
//   SMTP_PORT      e.g. 465
//   SMTP_SECURE    "true" for port 465 (implicit TLS)
//   SMTP_USERNAME  the sending Gmail address, e.g. amanavisiontech@gmail.com
//   SMTP_PASSWORD  a Google Account "App Password" (Security -> 2-Step Verification -> App
//                  passwords) — NOT the account's normal login password.
//   SMTP_FROM      the From header, e.g. "Amana Vision <amanavisiontech@gmail.com>"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by the platform.

import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@^9'

const WEIGHT_LABELS: Record<number, string> = { 1: 'small', 2: 'medium', 3: 'large' }
const RED = '#dc2626'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const transport = nodemailer.createTransport({
  host: Deno.env.get('SMTP_HOSTNAME')!,
  port: Number(Deno.env.get('SMTP_PORT')!),
  secure: Deno.env.get('SMTP_SECURE') === 'true',
  auth: {
    user: Deno.env.get('SMTP_USERNAME')!,
    pass: Deno.env.get('SMTP_PASSWORD')!,
  },
})

function sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    transport.sendMail({ from: Deno.env.get('SMTP_FROM')!, to, subject, text, html }, (error) =>
      error ? reject(error) : resolve(),
    )
  })
}

/** Task titles/names come straight from the database — escape before dropping them into HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

/** "2026-09-08" -> "Wednesday, 8th of September, 2026" */
function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const month = date.toLocaleDateString('en-US', { month: 'long' })
  const day = date.getDate()
  return `${weekday}, ${day}${ordinalSuffix(day)} of ${month}, ${date.getFullYear()}`
}

/**
 * "you" / "you and John" / "you, John, and Michael" — always built from every current assignee on
 * the task (not just whoever's newly added in this call), so a task someone's already sharing with
 * two teammates still reads as shared even when a third person is the one just being added.
 */
function joinWithYou(otherNames: string[]): string {
  if (otherNames.length === 0) return 'you'
  if (otherNames.length === 1) return `you and ${otherNames[0]}`
  return `you, ${otherNames.slice(0, -1).join(', ')}, and ${otherNames[otherNames.length - 1]}`
}

interface EmailContext {
  assigneeName: string
  peoplePhrase: string
  taskTitle: string
  weightLabel: string
  dueDate: string | null
}

function buildPlainText(ctx: EmailContext): string {
  const lines = [
    `Hi ${ctx.assigneeName || 'there'}!`,
    '',
    `A task has been assigned to ${ctx.peoplePhrase} on TeamOps: ${ctx.taskTitle}.`,
    '',
    ctx.dueDate
      ? `This is a ${ctx.weightLabel} task, and is due on ${formatDate(ctx.dueDate)}.`
      : `This is a ${ctx.weightLabel} task.`,
    '',
    'Thank you :)',
  ]
  return lines.join('\n')
}

function buildHtml(ctx: EmailContext): string {
  const dueSentence = ctx.dueDate
    ? `This is a ${escapeHtml(ctx.weightLabel)} task, and is due on <strong>${formatDate(ctx.dueDate)}</strong>.`
    : `This is a ${escapeHtml(ctx.weightLabel)} task.`

  return `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#000000;line-height:1.5;">
  <p>Hi ${escapeHtml(ctx.assigneeName || 'there')}!</p>
  <p>A task has been assigned to ${escapeHtml(ctx.peoplePhrase)} on TeamOps: <span style="color:${RED};">${escapeHtml(ctx.taskTitle)}</span>.</p>
  <p>${dueSentence}</p>
  <p>Thank you :)</p>
</div>`
}

interface RequestBody {
  taskId: string
  assigneeProfileIds: string[]
  actingProfileId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders })
  }

  try {
    const { taskId, assigneeProfileIds } = (await req.json()) as RequestBody
    if (!taskId || !Array.isArray(assigneeProfileIds) || assigneeProfileIds.length === 0) {
      return Response.json(
        { error: 'taskId and a non-empty assigneeProfileIds array are required' },
        { status: 400, headers: corsHeaders },
      )
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('title, weight, due_date')
      .eq('id', taskId)
      .single()
    if (taskError || !task) throw new Error(taskError?.message ?? 'Task not found')

    // Every current assignee on the task, not just the ones this particular call is notifying —
    // that's what lets the email correctly say "you, John, and Michael" for a task someone else
    // already shared, even when only one new person is being added right now.
    const { data: roster, error: rosterError } = await supabase
      .from('task_assignees')
      .select('profile_id, profiles(name)')
      .eq('task_id', taskId)
    if (rosterError) throw new Error(rosterError.message)

    const nameById = new Map<string, string>()
    for (const row of roster ?? []) {
      const name = (row.profiles as { name: string } | null)?.name
      if (name) nameById.set(row.profile_id as string, name)
    }

    const { data: recipients, error: recipientsError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', assigneeProfileIds)
    if (recipientsError) throw new Error(recipientsError.message)

    const outcomes = await Promise.allSettled(
      (recipients ?? [])
        .filter((r): r is { id: string; name: string; email: string } => !!r.email)
        .map((recipient) => {
          const otherNames = [...nameById.entries()]
            .filter(([id]) => id !== recipient.id)
            .map(([, name]) => name)
            .sort((a, b) => a.localeCompare(b))

          const ctx: EmailContext = {
            assigneeName: recipient.name,
            peoplePhrase: joinWithYou(otherNames),
            taskTitle: task.title,
            weightLabel: WEIGHT_LABELS[task.weight] ?? String(task.weight),
            dueDate: task.due_date,
          }
          return sendMail(
            recipient.email,
            `New Task – Amana Vision: ${task.title}`,
            buildPlainText(ctx),
            buildHtml(ctx),
          )
        }),
    )

    const failed = outcomes.filter((o) => o.status === 'rejected').length
    return Response.json({ sent: outcomes.length - failed, failed }, { headers: corsHeaders })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders },
    )
  }
})
