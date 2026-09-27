import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./use-debounced-value";

afterEach(() => vi.useRealTimers());

describe("useDebouncedValue", () => {
  it("publishes only the latest value after the delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 250),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ap" });
    rerender({ value: "app" });

    act(() => vi.advanceTimersByTime(249));
    expect(result.current).toBe("a");

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("app");
  });
});
