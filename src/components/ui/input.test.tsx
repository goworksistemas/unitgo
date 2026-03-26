import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Input } from "./input";

describe("Input", () => {
  it("renderiza e aceita digitação", async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Buscar" />);
    const el = screen.getByPlaceholderText("Buscar");
    await user.type(el, "abc");
    expect(el).toHaveValue("abc");
  });

  it("repassa type e data-slot", () => {
    render(<Input type="email" data-testid="inp" />);
    const el = screen.getByTestId("inp");
    expect(el).toHaveAttribute("type", "email");
    expect(el).toHaveAttribute("data-slot", "input");
  });
});
