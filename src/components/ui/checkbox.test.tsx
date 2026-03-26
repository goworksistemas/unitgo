import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("alterna estado ao clicar", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Aceito" />);
    const box = screen.getByRole("checkbox", { name: "Aceito" });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
    await user.click(box);
    expect(box).not.toBeChecked();
  });
});
