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

const WEIGHT_LABELS: Record<number, string> = { 1: 'Small', 2: 'Medium', 3: 'Large' }
const DASHBOARD_URL = 'https://o-oruk.github.io/team-ops/'

// Matches tailwind.config.js's `accent` color and the app's slate palette, so the email reads as
// the same product rather than a generic system notification.
const ACCENT = '#4f46e5'
const ACCENT_LIGHT = '#eef2ff'
const SLATE_900 = '#0f172a'
const SLATE_600 = '#475569'
const SLATE_400 = '#94a3b8'
const SLATE_200 = '#e2e8f0'
const RED_600 = '#dc2626'

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

/** "2026-09-15" -> "Tue, Sep 15" — email clients don't run JS, so this has to happen server-side. */
function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

interface EmailContext {
  assigneeName: string
  actingName: string
  taskTitle: string
  weightLabel: string
  objectiveTitle: string | null
  dueDate: string | null
}

function buildPlainText(ctx: EmailContext): string {
  return [
    `Hi ${ctx.assigneeName || 'there'},`,
    '',
    `${ctx.actingName} assigned you a task on the Amana Vision dashboard:`,
    '',
    ctx.taskTitle,
    `Size: ${ctx.weightLabel}`,
    ctx.objectiveTitle ? `Objective: ${ctx.objectiveTitle}` : null,
    ctx.dueDate ? `Due: ${formatDate(ctx.dueDate)}` : null,
    '',
    DASHBOARD_URL,
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
}

function detailRow(label: string, value: string, opts?: { color?: string; borderTop?: boolean }): string {
  const border = opts?.borderTop ? `border-top:1px solid ${SLATE_200};` : ''
  const color = opts?.color ?? SLATE_900
  return `
    <tr>
      <td style="padding:10px 0;font-size:13px;color:${SLATE_400};${border}">${label}</td>
      <td style="padding:10px 0;font-size:13px;font-weight:600;color:${color};text-align:right;${border}">${value}</td>
    </tr>`
}

function buildHtml(ctx: EmailContext): string {
  const rows = [
    detailRow('Size', escapeHtml(ctx.weightLabel)),
    ctx.objectiveTitle ? detailRow('Objective', escapeHtml(ctx.objectiveTitle), { borderTop: true }) : '',
    ctx.dueDate ? detailRow('Due', formatDate(ctx.dueDate), { color: RED_600, borderTop: true }) : '',
  ].join('')

  return `
<div style="background-color:#f8fafc;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${SLATE_200};">
    <div style="background-color:${ACCENT};padding:18px 24px;">
      <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.2px;">Amana Vision</span>
    </div>
    <div style="padding:28px 24px;">
      <p style="margin:0 0 4px;font-size:14px;color:${SLATE_600};">
        Hi ${escapeHtml(ctx.assigneeName || 'there')},
      </p>
      <p style="margin:0 0 20px;font-size:14px;color:${SLATE_600};">
        <strong style="color:${SLATE_900};">${escapeHtml(ctx.actingName)}</strong> assigned you a task:
      </p>
      <p style="margin:0 0 18px;padding:14px 16px;background-color:${ACCENT_LIGHT};border-radius:8px;font-size:16px;font-weight:700;color:${SLATE_900};">
        ${escapeHtml(ctx.taskTitle)}
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${rows}
      </table>
      <a href="${DASHBOARD_URL}" style="display:inline-block;background-color:${ACCENT};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;">
        Open dashboard
      </a>
    </div>
  </div>
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
    const { taskId, assigneeProfileIds, actingProfileId } = (await req.json()) as RequestBody
    if (!taskId || !Array.isArray(assigneeProfileIds) || assigneeProfileIds.length === 0) {
      return Response.json(
        { error: 'taskId and a non-empty assigneeProfileIds array are required' },
        { status: 400, headers: corsHeaders },
      )
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('title, weight, due_date, objectives(title)')
      .eq('id', taskId)
      .single()
    if (taskError || !task) throw new Error(taskError?.message ?? 'Task not found')

    const { data: assignees, error: assigneesError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', assigneeProfileIds)
    if (assigneesError) throw new Error(assigneesError.message)

    let actingName = 'Someone'
    if (actingProfileId) {
      const { data: actor } = await supabase.from('profiles').select('name').eq('id', actingProfileId).single()
      if (actor?.name) actingName = actor.name
    }

    const objectiveTitle = (task.objectives as { title: string } | null)?.title ?? null

    const outcomes = await Promise.allSettled(
      (assignees ?? [])
        .filter((a): a is { id: string; name: string; email: string } => !!a.email)
        .map((assignee) => {
          const ctx: EmailContext = {
            assigneeName: assignee.name,
            actingName,
            taskTitle: task.title,
            weightLabel: WEIGHT_LABELS[task.weight] ?? String(task.weight),
            objectiveTitle,
            dueDate: task.due_date,
          }
          return sendMail(assignee.email, `New task assigned: ${task.title}`, buildPlainText(ctx), buildHtml(ctx))
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
