let audioCtx: AudioContext | null = null

function getAudioContext() {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

// Bright two-note chime that plays when a task is marked done.
export function playTaskCompleteSound() {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') void ctx.resume()

    const notes = [
      { freq: 880, start: 0, duration: 0.14 }, // A5
      { freq: 1318.51, start: 0.09, duration: 0.22 }, // E6
    ]

    for (const { freq, start, duration } of notes) {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = freq
      oscillator.connect(gain)
      gain.connect(ctx.destination)

      const startTime = ctx.currentTime + start
      const endTime = startTime + duration
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, endTime)

      oscillator.start(startTime)
      oscillator.stop(endTime + 0.02)
    }
  } catch {
    // Web Audio unavailable — fail silently, sound is a nice-to-have.
  }
}
