import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters for your password.")
  .regex(/[A-Z]/, "Include at least one uppercase letter.")
  .regex(/[0-9]/, "Include at least one number.")
  .regex(
    /[!@#$%^&*()_+\-=[\]{};'":\\|<>?,./`~]/,
    "Include at least one special character, such as !, @, or #.",
  );

export const registrationSchema = z
  .object({
    email: z.email("Enter a valid email address.").trim(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

function callbackUrl() {
  return new URL("/auth/callback", window.location.origin).href;
}

export async function register(values: z.infer<typeof registrationSchema>) {
  const { email, password } = registrationSchema.parse(values);
  const { error } = await getSupabaseBrowserClient().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl() },
  });
  if (error) throw new Error(authErrorMessage(error.code));
}

export async function resendVerification(email: string) {
  const { error } = await getSupabaseBrowserClient().auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: callbackUrl() },
  });
  if (error) throw new Error(authErrorMessage(error.code));
}

export async function logIn({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(authErrorMessage(error.code));
}

export async function logOut() {
  const { error } = await getSupabaseBrowserClient().auth.signOut({
    scope: "local",
  });
  if (error) throw new Error("Unable to log out. Please try again.");
}

function authErrorMessage(code: string | undefined) {
  switch (code) {
    case "email_not_confirmed":
      return "Confirm your email before logging in. Open your verification email or request a new link from registration.";
    case "invalid_credentials":
      return "The email or password is incorrect.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many requests. Please wait before trying again.";
    case "email_address_not_authorized":
      return "Email delivery is currently limited to approved test addresses.";
    case "weak_password":
      return "Choose a stronger password.";
    default:
      return "Unable to complete the request. Please try again.";
  }
}
