import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createStore, useStore } from "zustand";
import { toAuthUser, type AuthUser } from "./types";

function createAuthStore(user: AuthUser | null) {
  return createStore<{
    user: AuthUser | null;
    status: "authenticated" | "anonymous";
    setUser: (user: AuthUser | null) => void;
  }>((set) => ({
    user,
    status: user ? "authenticated" : "anonymous",
    setUser: (user) =>
      set({ user, status: user ? "authenticated" : "anonymous" }),
  }));
}

const AuthContext = createContext<ReturnType<typeof createAuthStore> | null>(
  null,
);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null;
  children: ReactNode;
}) {
  const [store] = useState(() => createAuthStore(initialUser));
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void import("@/lib/supabase/client").then(
      ({ getSupabaseBrowserClient }) => {
        if (!active) return;
        const {
          data: { subscription },
        } = getSupabaseBrowserClient().auth.onAuthStateChange(
          (_event, session) => {
            store.getState().setUser(toAuthUser(session?.user ?? null));
          },
        );
        unsubscribe = () => subscription.unsubscribe();
      },
    );
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [store]);
  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
}

export function useAuthUser() {
  const store = useContext(AuthContext);
  if (!store) throw new Error("AuthProvider is required.");
  return useStore(store, (state) => state.user);
}
