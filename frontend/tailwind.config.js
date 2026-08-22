/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand & Accent
        primary: "#f43f5e",         // Neon Pink / Magenta
        "primary-active": "#e11d48", // Darker Pink
        secondary: "#1e75ff",       // Electric Blue
        "secondary-active": "#1d4ed8",
        
        // Surface
        canvas: "#111215",          // Deep charcoal body background
        "canvas-soft": "#16171b",   // Dark graphite IDE / header pane background
        "surface-card": "#1a1b1f",   // Dark graphite card surface
        "surface-strong": "#26272e", // Hover and badge background
        
        // Hairlines
        hairline: "#26272e",        // Subtle dark divider
        "hairline-soft": "#202128",  // Lighter dark divider
        "hairline-strong": "#32343d", // Stronger dark panel border
        
        // Text
        ink: "#f9fafb",             // High contrast white text
        body: "#9ca3af",            // Light grey running text
        "body-strong": "#f9fafb",   // High contrast white
        muted: "#6b7280",           // Slate grey subtitles
        "muted-soft": "#4b5563",    // Darker slate disabled text
        "on-primary": "#ffffff",    // White text on magenta
        
        // Timeline pastels
        "timeline-thinking": "#4b5563",
        "timeline-grep": "#1e75ff",
        "timeline-read": "#26272e",
        "timeline-edit": "#f43f5e",
        "timeline-done": "#ffffff",
        
        // Semantic
        "semantic-success": "#10b981", // Vivid green status
        "semantic-error": "#f43f5e",   // Magenta error
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "14px",
        lg: "20px",
        xl: "28px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'fade-in-slow': 'fadeIn 0.6s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
}

