import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NewsCard } from "./market-news";

describe("NewsCard", () => {
  it("shows an accessible external article link and relevant symbols", () => {
    render(
      <NewsCard
        article={{
          id: "123",
          headline: "Apple announces a new product",
          summary: "A short summary of the announcement.",
          source: "Example News",
          author: "Reporter",
          publishedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
          url: "https://example.com/apple-news",
          imageUrl: null,
          symbols: ["AAPL", "MSFT"],
        }}
      />,
    );

    const link = screen.getByRole("link", {
      name: /Apple announces a new product/,
    });
    expect(link).toHaveAttribute("href", "https://example.com/apple-news");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("Example News")).toBeVisible();
    expect(
      screen.getByText("A short summary of the announcement."),
    ).toBeVisible();
    expect(screen.getByText("AAPL")).toBeVisible();
    expect(screen.getByText("MSFT")).toBeVisible();
  });
});
