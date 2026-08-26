// Tiers ramp up the visual intensity as the streak grows, so a long streak actually feels like a bigger deal.
function tierFor(streak: number) {
  if (streak <= 0) return { glow: 0, id: 'dormant' as const }
  if (streak < 3) return { glow: 0.45, id: 'lit' as const }
  if (streak < 7) return { glow: 0.65, id: 'hot' as const }
  return { glow: 0.85, id: 'blazing' as const }
}

export function StreakFlame({ streak, size = 40 }: { streak: number; size?: number }) {
  const tier = tierFor(streak)
  const alive = streak > 0
  const gradientId = `flame-gradient-${size}-${tier.id}`

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      {alive && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-emerald-400 blur-md animate-glowpulse"
          style={{ opacity: tier.glow }}
        />
      )}
      {tier.id === 'blazing' && (
        <span
          aria-hidden
          className="absolute inset-[-6px] rounded-full border-2 border-emerald-300 animate-ping"
        />
      )}
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={`relative ${alive ? 'animate-flicker' : 'opacity-30 grayscale'}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="55%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#bbf7d0" />
          </linearGradient>
        </defs>
        <path
          fill={alive ? `url(#${gradientId})` : '#cbd5e1'}
          d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.176 7.547 7.547 0 01-1.705-1.715.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248z"
        />
        <path
          fill={alive ? '#f0fdf4' : '#e2e8f0'}
          d="M15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z"
        />
      </svg>
    </div>
  )
}
