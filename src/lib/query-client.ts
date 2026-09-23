import { QueryClient } from "@tanstack/react-query";

const defaultStaleTime = 30_000;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: defaultStaleTime,
      },
    },
  });
}
