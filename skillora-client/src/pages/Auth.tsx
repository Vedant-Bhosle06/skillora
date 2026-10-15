import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, Input, Card, Divider } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { toApiError } from "@/api/client";
import { useToast } from "@/context/ToastContext";
import { nextRouteFor } from "@/lib/redirect";

function validateEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

type Mode = "login" | "register";

interface FormError {
  message: string;
  emailTaken?: boolean;
}

export default function Auth({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<FormError | null>(null);
  const [loading, setLoading] = useState(false);

  const { status, user, login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;

  // The only post-login redirect: once the session is loaded, leave this page.
  if (status === "authenticated" && user) {
    return <Navigate to={nextRouteFor(user, from)} replace />;
  }

  function validate() {
    const e: Record<string, string> = {};
    if (mode === "register" && name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (!validateEmail(email)) e.email = "Enter a valid email address";
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !validate()) return;
    setFormError(null);

    setLoading(true);
    try {
      if (mode === "register") {
        await register(name.trim(), email.trim(), password);
        showToast("Account created — let's set up your profile", "success");
      } else {
        const me = await login(email.trim(), password);
        showToast(`Welcome back, ${me.name}!`, "success");
      }
      setPassword("");
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.status === 401) setFormError({ message: "Invalid email or password" });
      else if (apiErr.status === 409 && mode === "register") setFormError({ message: "An account with this email already exists", emailTaken: true });
      else setFormError({ message: apiErr.message });
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setErrors({});
    setFormError(null);
    navigate(mode === "login" ? "/register" : "/login", { state: location.state, replace: true });
  }

  const passStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "bg-red-500", "bg-amber-500", "bg-emerald-400", "bg-emerald-500"];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="4" r="2" fill="white" />
              <circle cx="3" cy="12" r="2" fill="white" opacity=".7" />
              <circle cx="13" cy="12" r="2" fill="white" opacity=".7" />
              <line x1="8" y1="6" x2="3" y2="10" stroke="white" strokeWidth="1.5" />
              <line x1="8" y1="6" x2="13" y2="10" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 className="font-display font-800 text-2xl text-foreground">SKILLORA</h1>
          <p className="text-muted-foreground text-sm mt-1">{mode === "login" ? "Sign in to your account" : "Create your free account"}</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {mode === "register" && (
              <Input label="Full name" placeholder="Alex Thornton" value={name} onChange={e => setName(e.target.value)} error={errors.name} autoComplete="name" />
            )}
            <Input label="Email" type="email" placeholder="alex@example.com" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} autoComplete="email" />
            <div>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPass ? "text" : "password"}
                  placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  error={errors.password}
                  hint={mode === "register" ? "Use uppercase, numbers, and symbols for a stronger password" : undefined}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-8 text-muted-foreground hover:text-foreground text-xs"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
              {mode === "register" && password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= passStrength ? strengthColor[passStrength] : "bg-muted"}`} />
                    ))}
                  </div>
                  <span className={`text-xs font-mono ${passStrength >= 3 ? "text-emerald-500" : passStrength === 2 ? "text-amber-500" : "text-red-500"}`}>
                    {strengthLabel[passStrength]}
                  </span>
                </div>
              )}
            </div>

            {formError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {formError.message}
                {formError.emailTaken && (
                  <>
                    {" — "}
                    <Link to="/login" state={location.state} replace onClick={() => { setErrors({}); setFormError(null); }} className="font-500 underline">Sign in instead</Link>
                  </>
                )}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign in →" : "Create account →"}
            </Button>
          </form>

          <Divider className="my-5" />

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={switchMode}
              className="text-primary font-500 hover:underline"
            >
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </p>

          {mode === "login" && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              Forgot your password? Contact an administrator.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
