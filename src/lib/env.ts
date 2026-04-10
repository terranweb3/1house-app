function requireEnv(name: string): string {
  const value = import.meta.env[name]
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Missing environment variable: ${name}. Add it to .env (see .env.example).`
    )
  }
  return value
}

export const env = {
  supabaseUrl: requireEnv("VITE_SUPABASE_URL"),
  supabaseAnonKey: requireEnv("VITE_SUPABASE_ANON_KEY"),
}

