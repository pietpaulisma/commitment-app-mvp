/**
 * Dashboard Color System
 *
 * Two primary gradient palettes:
 * - Opal (blue-purple): For sane mode, achievements, "made it" status
 * - Orange: For insane mode, alerts, pending items, time pressure
 */

export const COLORS = {
  // Opal Blue-Purple Gradient (Sane mode, achievements, made it)
  opal: {
    // Tailwind classes - simplified to blue to purple (no pink)
    from: 'from-blue-400',
    via: 'via-blue-500',
    to: 'to-purple-600',
    bg: 'bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    bgSubtle: 'bg-blue-900/20',
    glow: 'bg-blue-900/20',

    // CSS values for inline styles - simplified gradient
    gradient: 'linear-gradient(135deg, rgb(96, 165, 250) 0%, rgb(79, 70, 229) 100%)',
    boxShadow: '0 0 30px 5px rgba(96, 165, 250, 0.3), 0 0 15px 0px rgba(79, 70, 229, 0.4)',
    rgb: {
      primary: 'rgb(96, 165, 250)',
      secondary: 'rgb(79, 70, 229)',
      tertiary: 'rgb(79, 70, 229)',
    }
  },

  // Orange Gradient (Insane mode, alerts, time pressure)
  orange: {
    // Tailwind classes
    from: 'from-orange-500',
    via: 'via-orange-600',
    to: 'to-red-600',
    bg: 'bg-gradient-to-br from-orange-500 via-orange-600 to-red-600',
    text: 'text-orange-500',
    border: 'border-orange-500/20',
    bgSubtle: 'bg-orange-900/20',
    glow: 'bg-orange-900/20',

    // CSS values for inline styles
    gradient: 'linear-gradient(135deg, rgb(249, 115, 22) 0%, rgb(234, 88, 12) 50%, rgb(220, 38, 38) 100%)',
    boxShadow: '0 0 50px 10px rgba(249, 115, 22, 0.4), 0 0 20px 0px rgba(249, 115, 22, 0.6)',
    rgb: {
      primary: 'rgb(249, 115, 22)',
      secondary: 'rgb(234, 88, 12)',
      tertiary: 'rgb(220, 38, 38)',
    }
  },

  // Gray (Neutral, pending, sick mode)
  gray: {
    // Tailwind classes
    from: 'from-gray-600',
    via: 'via-gray-700',
    to: 'to-gray-800',
    bg: 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800',
    text: 'text-gray-400',
    border: 'border-gray-600/30',
    bgSubtle: 'bg-gray-800/40',
    glow: 'bg-gray-900/20',

    // CSS values for inline styles
    gradient: 'linear-gradient(135deg, rgb(75, 85, 99) 0%, rgb(55, 65, 81) 50%, rgb(31, 41, 55) 100%)',
    boxShadow: '0 0 50px 10px rgba(75, 85, 99, 0.3), 0 0 20px 0px rgba(75, 85, 99, 0.5)',
    rgb: {
      primary: 'rgb(75, 85, 99)',
      secondary: 'rgb(55, 65, 81)',
      tertiary: 'rgb(31, 41, 55)',
    }
  },

  // Yellow (Peak time, achievements)
  yellow: {
    text: 'text-yellow-500',
    icon: 'text-yellow-500',
    glow: 'bg-yellow-900/20',
  },
} as const;
