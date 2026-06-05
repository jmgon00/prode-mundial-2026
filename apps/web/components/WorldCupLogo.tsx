export function WorldCupLogo({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.25)} viewBox="0 0 100 125" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <radialGradient id="wc-sphere" cx="38%" cy="32%" r="65%">
          <stop offset="0%"   stopColor="#fef9c3" />
          <stop offset="50%"  stopColor="#eab308" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <linearGradient id="wc-gold" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%"   stopColor="#fef08a" />
          <stop offset="45%"  stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <linearGradient id="wc-base" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#fde68a" />
          <stop offset="100%" stopColor="#6b2400" />
        </linearGradient>
        <linearGradient id="wc-arm" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fef08a" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>

      {/* ── GLOBO TERRÁQUEO ───────────────────────── */}
      <circle cx="50" cy="22" r="19" fill="url(#wc-sphere)" />
      {/* meridianos y paralelos */}
      <ellipse cx="50" cy="22" rx="19" ry="6.5"  fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8"/>
      <ellipse cx="50" cy="22" rx="9"  ry="19"   fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.7"/>
      <ellipse cx="50" cy="22" rx="16" ry="19"   fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="0.6"/>
      <line x1="31" y1="22" x2="69" y2="22"      stroke="rgba(0,0,0,0.18)" strokeWidth="0.8"/>
      {/* luz */}
      <ellipse cx="43" cy="15" rx="7" ry="5" fill="rgba(255,255,255,0.22)" transform="rotate(-15 43 15)"/>

      {/* ── FIGURA IZQUIERDA ──────────────────────── */}
      {/* cabeza */}
      <circle cx="30" cy="43" r="4.5" fill="url(#wc-arm)"/>
      {/* brazo izquierdo hacia el globo */}
      <path d="M28 40 Q18 30 31 22" stroke="url(#wc-arm)" strokeWidth="4.5" strokeLinecap="round"/>
      {/* torso + pierna */}
      <path d="M26 47 Q24 56 25 66 Q26 70 28 68 Q30 60 31 55 Q32 60 31 68 Q32 71 35 68 Q35 58 33 47 Z" fill="url(#wc-arm)"/>
      {/* brazo derecho hacia abajo */}
      <path d="M33 47 Q38 52 37 58" stroke="url(#wc-arm)" strokeWidth="3" strokeLinecap="round"/>

      {/* ── FIGURA DERECHA (espejo) ───────────────── */}
      <circle cx="70" cy="43" r="4.5" fill="url(#wc-arm)"/>
      <path d="M72 40 Q82 30 69 22" stroke="url(#wc-arm)" strokeWidth="4.5" strokeLinecap="round"/>
      <path d="M74 47 Q76 56 75 66 Q74 70 72 68 Q70 60 69 55 Q68 60 69 68 Q68 71 65 68 Q65 58 67 47 Z" fill="url(#wc-arm)"/>
      <path d="M67 47 Q62 52 63 58" stroke="url(#wc-arm)" strokeWidth="3" strokeLinecap="round"/>

      {/* ── COPA ─────────────────────────────────── */}
      <path d="M32 68 L68 68 Q72 82 64 92 L36 92 Q28 82 32 68 Z" fill="url(#wc-gold)"/>
      {/* reflejo interior */}
      <path d="M40 69 Q37 78 39 89 L44 89 Q42 78 43 69 Z" fill="rgba(255,255,255,0.15)"/>
      {/* borde superior copa */}
      <rect x="30" y="66" width="40" height="4" rx="2" fill="url(#wc-gold)"/>

      {/* ── CUELLO ───────────────────────────────── */}
      <path d="M38 92 L62 92 L60 100 L40 100 Z" fill="url(#wc-base)"/>

      {/* ── BASE NIVEL 1 ─────────────────────────── */}
      <rect x="30" y="100" width="40" height="6" rx="2" fill="url(#wc-gold)"/>
      {/* Malachita verde (sello distintivo del trofeo real) */}
      <rect x="33" y="103" width="34" height="2" rx="1" fill="#14532d" opacity="0.9"/>

      {/* ── BASE NIVEL 2 ─────────────────────────── */}
      <rect x="18" y="106" width="64" height="11" rx="3" fill="url(#wc-base)"/>
      {/* franja decorativa */}
      <rect x="22" y="109" width="56" height="2" rx="1" fill="rgba(255,255,255,0.18)"/>
      {/* sombra base */}
      <rect x="18" y="115" width="64" height="2" rx="1" fill="rgba(0,0,0,0.15)"/>
    </svg>
  )
}
