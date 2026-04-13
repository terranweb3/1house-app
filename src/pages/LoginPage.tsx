import { House } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const { signInWithPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.length > 3 && password.length > 3,
    [email, password],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithPassword({ email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-gradient-to-br from-indigo-100/90 via-amber-50/80 to-orange-100/70 dark:from-indigo-950/90 dark:via-slate-900 dark:to-slate-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, oklch(0.7 0.12 264 / 0.35), transparent 45%), radial-gradient(circle at 80% 80%, oklch(0.85 0.08 75 / 0.4), transparent 40%)",
        }}
      />
      <div className="relative grid min-h-dvh w-full place-items-center p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
        <Card className="w-full max-w-md rounded-2xl border-border/50 shadow-[var(--shadow-warm-xl)] backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-2 text-center sm:text-left">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-warm-md)] sm:mx-0">
              <House className="size-8" weight="duotone" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                1House
              </CardTitle>
              <CardDescription className="text-base">
                Chào mừng quay lại — đăng nhập để quản lý khách sạn.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="login-password">Mật khẩu</Label>
                <Input
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-12 text-base"
                />
              </div>

              {error ? (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                className="h-12 w-full rounded-xl text-base shadow-[var(--shadow-warm-sm)]"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
