export interface AuthUser {
  readonly id: string;
  readonly email: string | null;
}

export function toAuthUser(
  user: { id: string; email?: string } | null,
): AuthUser | null {
  return user ? { id: user.id, email: user.email ?? null } : null;
}
