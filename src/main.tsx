import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import { ErrorBoundary } from "@/components/ErrorBoundary"
import { AuthProvider } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/contexts/ThemeContext"
import App from "./App.tsx"
import "./index.css"
import "./pwa"

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
)
