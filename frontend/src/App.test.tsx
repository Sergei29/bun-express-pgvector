import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils";
import App from "@/App";

describe("App", () => {
  it("renders the heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Books Club" }),
    ).toBeInTheDocument();
  });
});
