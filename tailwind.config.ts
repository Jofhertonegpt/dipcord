import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#E6EEF5", // Light winter sky
        foreground: "#1A2B3C", // Dark winter pine
        primary: {
          DEFAULT: "#2B4C6F", // Medium winter blue
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#8CA5BE", // Soft winter blue
          foreground: "#1A2B3C",
        },
        destructive: {
          DEFAULT: "#991B1B",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#B8C7D9", // Light winter gray
          foreground: "#1A2B3C",
        },
        accent: {
          DEFAULT: "#4A6885", // Deep winter blue
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A2B3C",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A2B3C",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { opacity: 0.2 },
          "50%": { opacity: 1 },
          "100%": { opacity: 0.2 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;