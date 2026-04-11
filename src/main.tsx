import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/contexts/ThemeContext"
import App from "./App.tsx"
import "./index.css"
import "./pwa"

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <ErrorBoundary>
            <App />
            <Toaster richColors closeButton />
          </ErrorBoundary>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </BrowserRouter>
)
