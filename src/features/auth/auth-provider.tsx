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
  onUserChange,
}: {
  initialUser: AuthUser | null;
  children: ReactNode;
  onUserChange?: (previousUserId: string | null) => Promise<void>;
}) {
  const [store] = useState(() => createAuthStore(initialUser));
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let changeTimer: ReturnType<typeof setTimeout> | undefined;
    void import("@/lib/supabase/client").then(
      ({ getSupabaseBrowserClient }) => {
        if (!active) return;
        const {
          data: { subscription },
        } = getSupabaseBrowserClient().auth.onAuthStateChange(
          (_event, session) => {
            const user = toAuthUser(session?.user ?? null);
            const previousUserId = store.getState().user?.id ?? null;
            const changed = previousUserId !== (user?.id ?? null);
            store.getState().setUser(user);
            if (changed && onUserChange) {
              clearTimeout(changeTimer);
              // Run outside Supabase's auth lock, since loaders may verify auth.
              changeTimer = setTimeout(() => {
                void onUserChange(previousUserId);
              }, 0);
            }
          },
        );
        unsubscribe = () => subscription.unsubscribe();
      },
    );
    return () => {
      active = false;
      clearTimeout(changeTimer);
      unsubscribe?.();
    };
  }, [store, onUserChange]);
  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
}

export function useAuthUser() {
  const store = useContext(AuthContext);
  if (!store) throw new Error("AuthProvider is required.");
  return useStore(store, (state) => state.user);
}
