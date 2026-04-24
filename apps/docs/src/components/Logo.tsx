type Props = {
  size?: number
  className?: string
}

export function Logo({ size = 40, className }: Props) {
  const id = "yolk-logo"
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Yolk warm gradient — off-center highlight to feel organic */}
        <radialGradient id={`${id}-yolk`} cx="38%" cy="32%" r="60%">
          <stop offset="0%"   stopColor="#FEF3C7" />
          <stop offset="35%"  stopColor="#FCD34D" />
          <stop offset="75%"  stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>

        {/* Ambient glow behind the yolk */}
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#F59E0B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"    />
        </radialGradient>

        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Ambient glow */}
      <circle
        cx="32" cy="32" r="30"
        fill={`url(#${id}-glow)`}
        filter={`url(#${id}-blur)`}
      />

      {/* Outer ring — the native shell */}
      <circle
        cx="32" cy="32" r="29.5"
        stroke="#F59E0B" strokeWidth="0.75"
        strokeOpacity="0.18"
      />

      {/* Bridge ring — the boundary between logic and platform */}
      <circle
        cx="32" cy="32" r="22"
        stroke="#FBBF24" strokeWidth="0.75"
        strokeDasharray="2.5 3"
        strokeOpacity="0.35"
      />

      {/* The yolk — the pure functional core */}
      <circle
        cx="32" cy="32" r="13.5"
        fill={`url(#${id}-yolk)`}
      />

      {/* Specular highlight */}
      <ellipse
        cx="28.5" cy="27.5" rx="4" ry="2.5"
        fill="white" fillOpacity="0.18"
        transform="rotate(-20 28.5 27.5)"
      />

      {/* Nucleus — the pure core */}
      <circle
        cx="32" cy="32" r="2"
        fill="#92400E" fillOpacity="0.4"
      />
    </svg>
  )
}

export function Wordmark({ size = 32 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo size={size} />
      <span
        className="font-semibold tracking-tight text-white"
        style={{ fontSize: size * 0.6 }}
      >
        yolk
      </span>
    </span>
  )
}
