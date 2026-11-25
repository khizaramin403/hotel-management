/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  corePlugins: { preflight: false },
  theme: {
    screens: { sm: "576px", md: "768px", lg: "992px", xl: "1200px", "2xl": "1600px" },
    extend: {
      colors: {
        green: {
          50: "#F0F5F4",
          100: "#E6EEEC",
          150: "#DCE8E5",
          200: "#C5D8D3",
          300: "#8FB0A8",
          500: "#2A6358",
          600: "#1F4D45",
          700: "#163A34",
          800: "#14312C",
          900: "#0D211E",
        },
        brass: {
          100: "#F6EBD6",
          300: "#E3CFA4",
          500: "#B8893B",
          700: "#8A6428",
        },
        neutral: {
          0: "#FFFFFF",
          50: "#F7F6F2",
          100: "#EFEDE6",
          200: "#E7E5DF",
          300: "#D6D3CB",
          400: "#9CA3AF",
          600: "#5B6472",
          700: "#4B5563",
          900: "#1F2933",
        },
        canvas: "#F7F6F2",
        line: "#E7E5DF",
        "line-strong": "#D6D3CB",
        ink: "#1F2933",
        muted: "#5B6472",
        placeholder: "#6B7280",
        success: {
          DEFAULT: "#2E7D4F",
          bg: "#E7F4EC",
          text: "#1F6B42",
        },
        warning: {
          DEFAULT: "#B7791F",
          bg: "#FDF3DC",
          text: "#8A5A00",
        },
        error: {
          DEFAULT: "#B42318",
          bg: "#FDECEA",
          hover: "#912018",
          pressed: "#7A1A12",
        },
        info: {
          DEFAULT: "#2B5C8A",
          bg: "#E8F0FA",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        e1: "0 4px 12px rgba(20,49,44,0.08)",
        e2: "0 12px 32px rgba(20,49,44,0.16)",
      },
      maxWidth: {
        container: "1200px",
      },
    },
  },
};
