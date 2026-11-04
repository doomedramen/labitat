import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialogClient } from "./confirm-dialog-client";
it("waits for deletion before closing and blocks duplicate activation", async () => {
  let finish!: () => void;
  const onConfirm = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const onOpenChange = vi.fn();
  render(
    <ConfirmDialogClient
      open
      onOpenChange={onOpenChange}
      title="Delete item"
      description="Delete this item?"
      onConfirm={onConfirm}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
  await act(async () => finish());
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
});
describe("confirmation recovery", () => {
  it("keeps a failed deletion open for retry", async () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialogClient
        open
        onOpenChange={onOpenChange}
        title="Delete item"
        description="Delete this item?"
        onConfirm={vi.fn().mockRejectedValue(new Error("Failed"))}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await expect(screen.findByRole("alert")).resolves.toHaveTextContent("Try again");
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
