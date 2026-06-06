const FLAGS: Record<string, string> = {
  // Grupo A
  'México': '🇲🇽', 'Mexico': '🇲🇽',
  'Sudáfrica': '🇿🇦', 'South Africa': '🇿🇦',
  'Corea del Sur': '🇰🇷', 'South Korea': '🇰🇷', 'Korea Republic': '🇰🇷',
  'Rep. Checa': '🇨🇿', 'Czech Republic': '🇨🇿', 'Czechia': '🇨🇿',
  // Grupo B
  'Canadá': '🇨🇦', 'Canada': '🇨🇦',
  'Bosnia y Herz.': '🇧🇦', 'Bosnia and Herzegovina': '🇧🇦',
  'Qatar': '🇶🇦',
  'Suiza': '🇨🇭', 'Switzerland': '🇨🇭',
  // Grupo C
  'Brasil': '🇧🇷', 'Brazil': '🇧🇷',
  'Marruecos': '🇲🇦', 'Morocco': '🇲🇦',
  'Haití': '🇭🇹', 'Haiti': '🇭🇹',
  'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  // Grupo D
  'Estados Unidos': '🇺🇸', 'United States': '🇺🇸', 'USA': '🇺🇸',
  'Paraguay': '🇵🇾',
  'Australia': '🇦🇺',
  'Turquía': '🇹🇷', 'Turkey': '🇹🇷', 'Turkiye': '🇹🇷',
  // Grupo E
  'Alemania': '🇩🇪', 'Germany': '🇩🇪',
  'Curazao': '🇨🇼', 'Curaçao': '🇨🇼', 'Curacao': '🇨🇼',
  'Costa de Marfil': '🇨🇮', "Côte d'Ivoire": '🇨🇮', 'Ivory Coast': '🇨🇮',
  'Ecuador': '🇪🇨',
  // Grupo F
  'Países Bajos': '🇳🇱', 'Netherlands': '🇳🇱',
  'Japón': '🇯🇵', 'Japan': '🇯🇵',
  'Suecia': '🇸🇪', 'Sweden': '🇸🇪',
  'Túnez': '🇹🇳', 'Tunisia': '🇹🇳',
  // Grupo G
  'Bélgica': '🇧🇪', 'Belgium': '🇧🇪',
  'Egipto': '🇪🇬', 'Egypt': '🇪🇬',
  'Irán': '🇮🇷', 'Iran': '🇮🇷',
  'Nueva Zelanda': '🇳🇿', 'New Zealand': '🇳🇿',
  // Grupo H
  'España': '🇪🇸', 'Spain': '🇪🇸',
  'Cabo Verde': '🇨🇻', 'Cape Verde': '🇨🇻',
  'Arabia Saudita': '🇸🇦', 'Saudi Arabia': '🇸🇦',
  'Uruguay': '🇺🇾',
  // Grupo I
  'Francia': '🇫🇷', 'France': '🇫🇷',
  'Senegal': '🇸🇳',
  'Irak': '🇮🇶', 'Iraq': '🇮🇶',
  'Noruega': '🇳🇴', 'Norway': '🇳🇴',
  // Grupo J
  'Argentina': '🇦🇷',
  'Argelia': '🇩🇿', 'Algeria': '🇩🇿',
  'Austria': '🇦🇹',
  'Jordania': '🇯🇴', 'Jordan': '🇯🇴',
  // Grupo K
  'Portugal': '🇵🇹',
  'Congo': '🇨🇩', 'DR Congo': '🇨🇩',
  'Uzbekistán': '🇺🇿', 'Uzbekistan': '🇺🇿',
  'Colombia': '🇨🇴',
  // Grupo L
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croacia': '🇭🇷', 'Croatia': '🇭🇷',
  'Ghana': '🇬🇭',
  'Panamá': '🇵🇦', 'Panama': '🇵🇦',
}

export function getFlag(teamName: string): string {
  return FLAGS[teamName] ?? ''
}
