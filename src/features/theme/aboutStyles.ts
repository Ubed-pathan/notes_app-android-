/** About section — fixed colors, never affected by custom accent palette */
export const ABOUT_COLORS = {
  light: {
    surface: '#FFFFFF',
    border: '#E8E4F3',
    title: '#1C1B1F',
    body: '#49454F',
    bodyMuted: '#79747E',
    subheader: '#49454F',
    chipBackground: '#F2EDF7',
    chipText: '#1C1B1F',
    chipIcon: '#5B4FCF',
    iconBackground: '#F2EDF7',
  },
  dark: {
    surface: '#1B1B1F',
    border: '#3A3848',
    title: '#E6E1E5',
    body: '#CAC4D0',
    bodyMuted: '#938F99',
    subheader: '#CAC4D0',
    chipBackground: '#2A2831',
    chipText: '#E6E1E5',
    chipIcon: '#CFBCFF',
    iconBackground: '#2A2831',
  },
} as const;
