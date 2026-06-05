export function WorldCupLogo({ size = 80 }: { size?: number }) {
  const h = size * 1.2
  return (
    <svg width={size} height={h} viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="wc-g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fef08a" />
          <stop offset="50%"  stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
        <linearGradient id="wc-g2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#fef9c3" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <filter id="wc-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Globo terráqueo */}
      <circle cx="40" cy="20" r="16" fill="url(#wc-g1)" filter="url(#wc-glow)" />
      <ellipse cx="40" cy="20" rx="16" ry="5.5" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.7"/>
      <ellipse cx="40" cy="20" rx="7.5" ry="16" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.7"/>
      <line x1="24" y1="20" x2="56" y2="20" stroke="rgba(0,0,0,0.18)" strokeWidth="0.7"/>
      <circle cx="40" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5"/>

      {/* Figura izquierda */}
      <path d="M24 40 Q18 28 26 19 Q32 16 36 20 L31 40 Z" fill="url(#wc-g2)" opacity="0.92"/>
      {/* Figura derecha */}
      <path d="M56 40 Q62 28 54 19 Q48 16 44 20 L49 40 Z" fill="url(#wc-g2)" opacity="0.92"/>

      {/* Cuerpo de la copa */}
      <path d="M27 40 Q24 54 28 62 L52 62 Q56 54 53 40 Z" fill="url(#wc-g1)"/>
      {/* Reflejo copa */}
      <path d="M32 41 Q30 51 32 59 L37 59 Q35 49 36 41 Z" fill="rgba(255,255,255,0.18)" />

      {/* Cuello */}
      <path d="M34 62 L46 62 L44 70 L36 70 Z" fill="url(#wc-g2)"/>

      {/* Base superior */}
      <rect x="22" y="70" width="36" height="6" rx="2" fill="url(#wc-g1)"/>
      {/* Base inferior */}
      <rect x="16" y="76" width="48" height="10" rx="3" fill="url(#wc-g2)"/>
      {/* Línea decorativa base */}
      <rect x="19" y="79" width="42" height="1.5" rx="1" fill="rgba(255,255,255,0.2)"/>
    </svg>
  )
}
