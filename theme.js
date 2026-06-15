/**
 * Classic Indian Rummy — Theme Configuration
 *
 * Dual-mode (Light/Dark) design system with premium card-game aesthetics.
 * Colors inspired by royal Indian palaces — deep golds, rich maroons, emerald greens.
 */

export const lightTheme = {
  mode: 'light',
  colors: {
    // Primary palette
    primary: '#8B0000',        // Deep maroon — main brand
    primaryLight: '#C62828',
    primaryDark: '#5D0000',
    secondary: '#D4AF37',      // Royal gold
    secondaryLight: '#F0D060',
    accent: '#1B5E20',         // Emerald green
    accentLight: '#2E7D32',

    // Backgrounds
    background: '#FEF9F0',     // Warm cream
    surface: '#FFFFFF',
    surfaceVariant: '#F5F0E8',
    card: '#FFFFFF',
    cardBorder: '#E0D5C0',
    tableGreen: '#1B6B3A',     // Game table felt

    // Text
    text: '#1A1A2E',
    textSecondary: '#6B6358',
    textInverse: '#FFFFFF',
    textMuted: '#9E9589',

    // Status
    success: '#2E7D32',
    warning: '#F9A825',
    error: '#D32F2F',
    info: '#1565C0',

    // Game-specific
    joker: '#FF6F00',
    declare: '#4CAF50',
    drop: '#EF5350',
    chipGold: '#D4AF37',
    xpPurple: '#7B1FA2',

    // UI elements
    border: '#E0D5C0',
    divider: '#EDE5D5',
    shadow: 'rgba(0,0,0,0.08)',
    overlay: 'rgba(0,0,0,0.5)',
    disabled: '#C5BFB0',
    placeholder: '#B0A898',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 6, md: 12, lg: 20, xl: 28, full: 9999 },
  fontSize: {
    xs: 10, sm: 12, md: 14, lg: 16, xl: 20,
    xxl: 24, xxxl: 32, hero: 42,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  shadow: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
    xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
  },
};

export const darkTheme = {
  mode: 'dark',
  colors: {
    primary: '#C62828',
    primaryLight: '#EF5350',
    primaryDark: '#8B0000',
    secondary: '#F0D060',
    secondaryLight: '#FFE082',
    accent: '#43A047',
    accentLight: '#66BB6A',

    background: '#0D0D1A',
    surface: '#1A1A2E',
    surfaceVariant: '#232340',
    card: '#1E1E35',
    cardBorder: '#2D2D4A',
    tableGreen: '#0E3D1F',

    text: '#F5F0E8',
    textSecondary: '#A09B8C',
    textInverse: '#1A1A2E',
    textMuted: '#6B6358',

    success: '#4CAF50',
    warning: '#FFB300',
    error: '#EF5350',
    info: '#42A5F5',

    joker: '#FF9800',
    declare: '#66BB6A',
    drop: '#EF5350',
    chipGold: '#F0D060',
    xpPurple: '#AB47BC',

    border: '#2D2D4A',
    divider: '#252545',
    shadow: 'rgba(0,0,0,0.3)',
    overlay: 'rgba(0,0,0,0.7)',
    disabled: '#4A4A6A',
    placeholder: '#6B6358',
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  fontSize: lightTheme.fontSize,
  fontWeight: lightTheme.fontWeight,
  shadow: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 1 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  },
};

export const tierColors = {
  0: '#CD7F32', // Bronze
  1: '#C0C0C0', // Silver
  2: '#FFD700', // Gold
  3: '#E5E4E2', // Platinum
  4: '#B9F2FF', // Diamond
  5: '#7B2FBE', // Master
};

export const suitColors = {
  S: '#1A1A2E',  // Spades
  H: '#D32F2F',  // Hearts
  D: '#D32F2F',  // Diamonds
  C: '#1A1A2E',  // Clubs
};
