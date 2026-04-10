import { createContext, useContext, useEffect, useMemo, useState } from "react"

type Theme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = "theme"

function getInitialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === "light" || saved === "dark") return saved
  } catch {
    // ignore
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyThemeToDom(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  // Helps form controls match theme in supporting browsers.
  document.documentElement.style.colorScheme = theme
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Avoid touching window during SSR; this app is client-only, but keep safe.
    if (typeof window === "undefined") return "light"
    return getInitialTheme()
  })

  const setTheme = (next: Theme) => {
    setThemeState(next)
    applyThemeToDom(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  useEffect(() => {
    applyThemeToDom(theme)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}

