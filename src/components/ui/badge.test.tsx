import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renderiza texto e data-slot", () => {
    render(<Badge>Novo</Badge>);
    const el = screen.getByText("Novo");
    expect(el).toHaveAttribute("data-slot", "badge");
  });
});
