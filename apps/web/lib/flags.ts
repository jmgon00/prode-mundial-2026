// ISO 3166-1 alpha-2 codes para flagcdn.com
const ISO_CODES: Record<string, string> = {
  // Grupo A
  'México': 'mx', 'Mexico': 'mx',
  'Sudáfrica': 'za', 'South Africa': 'za',
  'Corea del Sur': 'kr', 'South Korea': 'kr', 'Korea Republic': 'kr',
  'Rep. Checa': 'cz', 'Czech Republic': 'cz', 'Czechia': 'cz',
  // Grupo B
  'Canadá': 'ca', 'Canada': 'ca',
  'Bosnia y Herz.': 'ba', 'Bosnia and Herzegovina': 'ba',
  'Qatar': 'qa',
  'Suiza': 'ch', 'Switzerland': 'ch',
  // Grupo C
  'Brasil': 'br', 'Brazil': 'br',
  'Marruecos': 'ma', 'Morocco': 'ma',
  'Haití': 'ht', 'Haiti': 'ht',
  'Escocia': 'gb-sct', 'Scotland': 'gb-sct',
  // Grupo D
  'Estados Unidos': 'us', 'United States': 'us', 'USA': 'us',
  'Paraguay': 'py',
  'Australia': 'au',
  'Turquía': 'tr', 'Turkey': 'tr', 'Turkiye': 'tr',
  // Grupo E
  'Alemania': 'de', 'Germany': 'de',
  'Curazao': 'cw', 'Curaçao': 'cw', 'Curacao': 'cw',
  'Costa de Marfil': 'ci', "Côte d'Ivoire": 'ci', 'Ivory Coast': 'ci',
  'Ecuador': 'ec',
  // Grupo F
  'Países Bajos': 'nl', 'Netherlands': 'nl',
  'Japón': 'jp', 'Japan': 'jp',
  'Suecia': 'se', 'Sweden': 'se',
  'Túnez': 'tn', 'Tunisia': 'tn',
  // Grupo G
  'Bélgica': 'be', 'Belgium': 'be',
  'Egipto': 'eg', 'Egypt': 'eg',
  'Irán': 'ir', 'Iran': 'ir',
  'Nueva Zelanda': 'nz', 'New Zealand': 'nz',
  // Grupo H
  'España': 'es', 'Spain': 'es',
  'Cabo Verde': 'cv', 'Cape Verde': 'cv',
  'Arabia Saudita': 'sa', 'Saudi Arabia': 'sa',
  'Uruguay': 'uy',
  // Grupo I
  'Francia': 'fr', 'France': 'fr',
  'Senegal': 'sn',
  'Irak': 'iq', 'Iraq': 'iq',
  'Noruega': 'no', 'Norway': 'no',
  // Grupo J
  'Argentina': 'ar',
  'Argelia': 'dz', 'Algeria': 'dz',
  'Austria': 'at',
  'Jordania': 'jo', 'Jordan': 'jo',
  // Grupo K
  'Portugal': 'pt',
  'Congo': 'cd', 'DR Congo': 'cd',
  'Uzbekistán': 'uz', 'Uzbekistan': 'uz',
  'Colombia': 'co',
  // Grupo L
  'Inglaterra': 'gb-eng', 'England': 'gb-eng',
  'Croacia': 'hr', 'Croatia': 'hr',
  'Ghana': 'gh',
  'Panamá': 'pa', 'Panama': 'pa',
}

export function getFlagUrl(teamName: string): string | null {
  const code = ISO_CODES[teamName]
  if (!code) return null
  return `https://flagcdn.com/w20/${code}.png`
}

export function getFlag(teamName: string): string {
  // Fallback emoji (funciona en iOS/Android, no en Windows)
  return ''
}
