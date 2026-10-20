import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, Input, Divider } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { toApiError } from "@/api/client";
import { useToast } from "@/context/ToastContext";
import { nextRouteFor } from "@/lib/redirect";
import Logo from "@/components/Logo";
import LineIllustration from "@/components/landing/LineIllustration";
import { SignPanel } from "@/components/transit";
import { ArrowIcon, WarningIcon } from "@/components/transit/icons";

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
  const strengthColor = ["", "bg-primary", "bg-line-design", "bg-line-web", "bg-line-web"];

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_minmax(30rem,36rem)]">
      {/* The line, drawn still */}
      <aside className="hidden flex-col justify-between border-r-2 border-border bg-card p-10 lg:flex" aria-label="About SKILLORA">
        <Link to="/" aria-label="SKILLORA home" className="flex min-h-11 w-max items-center rounded-md">
          <Logo variant="mark" wordmark size={28} wordmarkClassName="text-[18px]" />
        </Link>
        <div>
          <LineIllustration className="mx-auto w-full max-w-md" />
          <p className="mx-auto mt-8 max-w-md text-[clamp(1.6rem,2.4vw,2.2rem)] font-[850] leading-[1.05] tracking-[-0.02em] text-foreground">
            Your line to your next role.
          </p>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            Tell us the skills you have and the job you want. We plan the stops in between, in an order that always works.
          </p>
        </div>
        <span />
      </aside>

      <main className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" aria-label="SKILLORA home" className="mb-4 flex min-h-11 w-max items-center rounded-md lg:hidden">
              <Logo variant="mark" wordmark size={28} wordmarkClassName="text-[18px]" />
            </Link>
            <h1 className="font-display font-800 text-3xl text-foreground">{mode === "login" ? "Sign in" : "Create your account"}</h1>
            <p className="mt-1 text-base text-muted-foreground">{mode === "login" ? "Pick up where your line left off." : "Free, and it takes a minute."}</p>
          </div>

          <SignPanel rule="var(--line-route)" className="p-6">
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
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    aria-pressed={showPass}
                    aria-label={showPass ? "Hide password" : "Show password"}
                    className="absolute right-1 top-6 flex h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm font-700 text-foreground hover:bg-muted"
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
                {mode === "register" && password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= passStrength ? strengthColor[passStrength] : "bg-muted"}`} />
                      ))}
                    </div>
                    <span className="text-sm font-700 text-foreground">{strengthLabel[passStrength]}</span>
                  </div>
                )}
              </div>

              {formError && (
                <div role="alert" className="flex items-start gap-2 rounded-md border-2 border-primary px-3 py-2 text-sm font-600 text-foreground">
                  <WarningIcon size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>
                    {formError.message}
                    {formError.emailTaken && (
                      <>
                        {" — "}
                        <Link to="/login" state={location.state} replace onClick={() => { setErrors({}); setFormError(null); }} className="font-700 underline underline-offset-2">Sign in instead</Link>
                      </>
                    )}
                  </span>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
                {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
                {!loading && <ArrowIcon size={16} />}
              </Button>
            </form>

            <Divider className="my-5" />

            <p className="text-center text-sm text-muted-foreground">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={switchMode}
                className="inline-flex min-h-11 items-center px-1 font-700 text-foreground underline underline-offset-4"
              >
                {mode === "login" ? "Create one" : "Sign in"}
              </button>
            </p>

            {mode === "login" && (
              <p className="text-center text-sm text-muted-foreground mt-1">
                Forgot your password? Contact an administrator.
              </p>
            )}
          </SignPanel>
        </div>
      </main>
    </div>
  );
}
