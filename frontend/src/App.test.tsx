import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("PracticeLab application", () => {
  it("renders the home page and primary navigation", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Build control, one focused session at a time." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tools" })).toHaveAttribute("href", "/tools");
    expect(screen.getByRole("link", { name: "Exercises" })).toHaveAttribute("href", "/exercises");
  });
});
