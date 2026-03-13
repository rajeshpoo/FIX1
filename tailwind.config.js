
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'sans-serif'] },
      colors: {
        background: { light: '#FFFFFF', dark: '#020617' }, // Changed to Pure White
        surface: { light: '#FFFFFF', dark: '#0F172A' },
        primary: { DEFAULT: '#6366F1', dark: '#4F46E5' }
      },
      animation: {
        'truck-drive': 'truckDrive 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'profile-pop': 'profilePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pop-in': 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        truckDrive: {
          '0%': { transform: 'translateX(-50px) scale(0.6)', opacity: '0' },
          '70%': { transform: 'translateX(10px) scale(1.1) rotate(5deg)', opacity: '1' },
          '100%': { transform: 'translateX(0) scale(1) rotate(0deg)', opacity: '1' },
        },
        profilePop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2) rotate(8deg)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        popIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      }
    }
  },
  plugins: [],
}
