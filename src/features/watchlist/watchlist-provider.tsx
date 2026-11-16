import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "@/features/auth/auth-provider";
import type { InstrumentSearchResult } from "@/features/instruments/api/search-instruments";
import { ownedWatchlistQueryOptions } from "./queries/owned-watchlist";
import {
  wasWatchlistInitialized,
  markWatchlistInitialized,
} from "./initialization";
import {
  getWatchlistInstrumentId,
  useWatchlistStore,
} from "./store/watchlist-store";

export function mergeWatchlist(
  current: readonly InstrumentSearchResult[],
  incoming: readonly InstrumentSearchResult[],
) {
  const seen = new Set(current.map(getWatchlistInstrumentId));
  return [
    ...current,
    ...incoming.filter((instrument) => {
      const id = getWatchlistInstrumentId(instrument);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  ].slice(0, 20);
}

interface WatchlistView {
  instruments: readonly InstrumentSearchResult[];
  hasHydrated: boolean;
  isSaving: boolean;
  error: string | null;
  addInstrument: (instrument: InstrumentSearchResult) => void;
  removeInstrument: (provider: string, providerAssetId: string) => void;
  reorderInstrument: (active: string, over: string) => void;
  retry: () => void;
}
const WatchlistContext = createContext<WatchlistView | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const user = useAuthUser();
  const initializedOwner = useRef<string | null>(null);
  const anonymous = useWatchlistStore();
  const queryClient = useQueryClient();
  const queryKey = ownedWatchlistQueryOptions(user?.id ?? "anonymous").queryKey;
  const query = useQuery({
    ...ownedWatchlistQueryOptions(user?.id ?? "anonymous"),
    enabled: Boolean(user),
    refetchOnWindowFocus: () =>
      queryClient.isMutating({ mutationKey: queryKey }) === 0,
  });
  const mutation = useMutation({
    mutationKey: queryKey,
    mutationFn: async ({
      owner,
      revision,
      instruments,
    }: {
      owner: string;
      revision: number;
      instruments: InstrumentSearchResult[];
      seeding: boolean;
    }) =>
      (await import("./api/owned-watchlist")).saveOwnedWatchlist(
        owner,
        revision,
        instruments,
      ),
    onMutate: async (variables) => {
      const key = ownedWatchlistQueryOptions(variables.owner).queryKey;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, {
        revision: variables.revision,
        instruments: variables.instruments,
      });
      return { previous };
    },
    onSuccess: (data, variables) => {
      if (
        !queryClient.getQueryState(
          ownedWatchlistQueryOptions(variables.owner).queryKey,
        )
      )
        return;
      queryClient.setQueryData(
        ownedWatchlistQueryOptions(variables.owner).queryKey,
        data,
      );
      if (variables.seeding) markWatchlistInitialized(variables.owner);
    },
    onError: (_error, variables, context) => {
      if (
        !queryClient.getQueryState(
          ownedWatchlistQueryOptions(variables.owner).queryKey,
        )
      )
        return;
      queryClient.setQueryData(
        ownedWatchlistQueryOptions(variables.owner).queryKey,
        context?.previous,
      );
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ownedWatchlistQueryOptions(variables.owner).queryKey,
      });
    },
  });
  useEffect(() => {
    void Promise.resolve(useWatchlistStore.persist.rehydrate()).finally(() =>
      useWatchlistStore.setState({ hasHydrated: true }),
    );
  }, []);

  const { mutate } = mutation;
  useEffect(() => {
    if (!user) {
      initializedOwner.current = null;
      return;
    }
    if (
      !anonymous.hasHydrated ||
      !query.isSuccess ||
      query.isFetching ||
      !query.data ||
      initializedOwner.current === user.id ||
      queryClient.isMutating({ mutationKey: queryKey })
    )
      return;

    initializedOwner.current = user.id;
    if (wasWatchlistInitialized(user.id)) return;

    if (
      query.data.instruments.length === 0 &&
      anonymous.instruments.length > 0
    ) {
      // The expected revision makes this safe if another tab fills the account
      // between our read and save. The anonymous list always stays intact.
      mutate({
        owner: user.id,
        revision: query.data.revision,
        instruments: mergeWatchlist([], anonymous.instruments),
        seeding: true,
      });
    } else {
      markWatchlistInitialized(user.id);
    }
  }, [
    user,
    anonymous.hasHydrated,
    anonymous.instruments,
    query.isSuccess,
    query.isFetching,
    query.data,
    queryClient,
    queryKey,
    mutate,
  ]);

  const instruments = user
    ? (query.data?.instruments ?? [])
    : anonymous.instruments;
  const hasHydrated = user ? query.isSuccess : anonymous.hasHydrated;
  const isSaving = mutation.isPending && mutation.variables?.owner === user?.id;

  function write(next: readonly InstrumentSearchResult[]) {
    if (
      !user ||
      !query.data ||
      queryClient.isMutating({ mutationKey: queryKey })
    )
      return;
    mutation.mutate({
      owner: user.id,
      revision: query.data.revision,
      instruments: [...next],
      seeding: false,
    });
  }

  return (
    <WatchlistContext.Provider
      value={{
        instruments,
        hasHydrated,
        isSaving,
        error: user
          ? (query.error?.message ??
            (mutation.variables?.owner === user.id
              ? mutation.error?.message
              : null) ??
            null)
          : null,
        addInstrument: (instrument) => {
          if (!user) {
            anonymous.addInstrument(instrument);
            return;
          }
          const next = mergeWatchlist(instruments, [instrument]);
          if (next.length !== instruments.length) write(next);
        },
        removeInstrument: (provider, providerAssetId) => {
          if (!user) {
            anonymous.removeInstrument(provider, providerAssetId);
            return;
          }
          write(
            instruments.filter(
              (instrument) =>
                instrument.provider !== provider ||
                instrument.providerAssetId !== providerAssetId,
            ),
          );
        },
        reorderInstrument: (active, over) => {
          if (!user) {
            anonymous.reorderInstrument(active, over);
            return;
          }
          const from = instruments.findIndex(
            (instrument) => getWatchlistInstrumentId(instrument) === active,
          );
          const to = instruments.findIndex(
            (instrument) => getWatchlistInstrumentId(instrument) === over,
          );
          if (from < 0 || to < 0 || from === to) return;
          const next = [...instruments];
          const [moved] = next.splice(from, 1);
          if (moved) next.splice(to, 0, moved);
          write(next);
        },
        retry: () => {
          if (
            mutation.error &&
            mutation.variables?.seeding &&
            mutation.variables.owner === user?.id
          ) {
            initializedOwner.current = null;
            markWatchlistInitialized(null);
          }
          mutation.reset();
          void query.refetch();
        },
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const value = useContext(WatchlistContext);
  if (!value) throw new Error("WatchlistProvider is required.");
  return value;
}
