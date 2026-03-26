import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./input";
import { Label } from "./label";

describe("Label", () => {
  it("associa ao controle via htmlFor", () => {
    render(
      <>
        <Label htmlFor="campo-x">Nome</Label>
        <Input id="campo-x" />
      </>,
    );
    const label = screen.getByText("Nome");
    expect(label).toHaveAttribute("for", "campo-x");
    expect(label).toHaveAttribute("data-slot", "label");
  });
});
