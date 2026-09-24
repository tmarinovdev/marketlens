import { describe, expect, it } from "vitest";
import { createQueryClient } from "./query-client";

describe("createQueryClient", () => {
  it("creates isolated caches for separate SSR requests", () => {
    const firstClient = createQueryClient();
    const secondClient = createQueryClient();
    const queryKey = ["request-specific-data"] as const;

    firstClient.setQueryData(queryKey, "first request");

    expect(firstClient.getQueryData(queryKey)).toBe("first request");
    expect(secondClient.getQueryData(queryKey)).toBeUndefined();
  });

  it("keeps hydrated queries fresh for thirty seconds by default", () => {
    const queryClient = createQueryClient();

    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(30_000);
  });
});
