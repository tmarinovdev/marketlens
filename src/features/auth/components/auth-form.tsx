import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import {
  logIn,
  register,
  registrationSchema,
  resendVerification,
} from "../api";

const subscribeToHydration = () => () => {};

export function AuthForm({
  mode,
  verificationFailed = false,
}: {
  mode: "register" | "login";
  verificationFailed?: boolean;
}) {
  const isRegistration = mode === "register";
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );
  const [resendCoolingDown, setResendCoolingDown] = useState(false);
  useEffect(() => {
    if (!resendCoolingDown) return;
    const timer = window.setTimeout(() => setResendCoolingDown(false), 60_000);
    return () => window.clearTimeout(timer);
  }, [resendCoolingDown]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isRegistration)
        await register({ email: email.trim(), password, confirmPassword });
      else await logIn({ email: email.trim(), password });
    },
    onSuccess: () => {
      if (isRegistration) {
        setConfirmationEmail(email.trim());
        setPassword("");
        setConfirmPassword("");
        setResendCoolingDown(true);
      } else window.location.assign("/");
    },
  });
  const resend = useMutation({
    mutationFn: () => resendVerification(confirmationEmail ?? email.trim()),
    onSuccess: () => setResendCoolingDown(true),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setValidationError(null);
    if (isRegistration) {
      const parsed = registrationSchema.safeParse({
        email: email.trim(),
        password,
        confirmPassword,
      });
      if (!parsed.success) {
        setValidationError(
          parsed.error.issues[0]?.message ?? "Check your details.",
        );
        return;
      }
    }
    mutation.mutate();
  }

  const error =
    validationError ?? mutation.error?.message ?? resend.error?.message;
  return (
    <main className="mx-auto w-full max-w-md px-3 py-8 sm:px-5 sm:py-12">
      <section className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          {confirmationEmail
            ? "Check your email"
            : isRegistration
              ? "Create an account"
              : "Log in"}
        </h1>
        {verificationFailed ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            This verification link could not be completed. It may have expired
            or been opened in a different browser. Log in if your email is
            already confirmed, or request a new link and open it in this
            browser.
          </p>
        ) : null}
        {confirmationEmail ? (
          <p
            role="status"
            className="mt-3 text-sm leading-relaxed text-muted-foreground"
          >
            If registration can proceed, a verification link will be sent to{" "}
            {confirmationEmail}. Open it in this browser to confirm your email.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <fieldset disabled={!hydrated} className="space-y-4">
              <AuthField
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
              />
              <AuthField
                label="Password"
                name="password"
                type="password"
                autoComplete={
                  isRegistration ? "new-password" : "current-password"
                }
                minLength={isRegistration ? 8 : undefined}
                value={password}
                onChange={setPassword}
              />
              {isRegistration ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Use at least 8 characters, including one uppercase letter,
                    one number, and one special character (such as !, @, or #).
                  </p>
                  <AuthField
                    label="Confirm password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                  />
                </>
              ) : null}
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="h-11 w-full"
              >
                {mutation.isPending
                  ? "Please wait…"
                  : isRegistration
                    ? "Create account"
                    : "Log in"}
              </Button>
            </fieldset>
          </form>
        )}
        {error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {confirmationEmail || verificationFailed ? (
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={resendCoolingDown || resend.isPending || !email.trim()}
              onClick={() => resend.mutate()}
            >
              {resendCoolingDown
                ? "Wait 60 seconds before resending"
                : resend.isPending
                  ? "Sending…"
                  : "Resend verification link"}
            </Button>
            {resend.isSuccess ? (
              <p role="status" className="mt-2 text-sm text-muted-foreground">
                If the account needs confirmation, a new link has been
                requested.
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="mt-6 text-sm text-muted-foreground">
          {isRegistration ? "Already have an account? " : "New to MarketLens? "}
          <Link
            to={isRegistration ? "/login" : "/register"}
            className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {isRegistration ? "Log in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}

function AuthField({
  label,
  name,
  type,
  autoComplete,
  value,
  onChange,
  minLength,
}: {
  label: string;
  name: string;
  type: "email" | "password";
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/20"
      />
    </div>
  );
}
