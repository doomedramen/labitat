import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";

vi.mock("@/actions/auth", () => ({
  login: vi.fn(),
}));

describe("LoginForm validation", () => {
  it("clears the required-password error as soon as a password is entered", async () => {
    render(<LoginForm />);

    const password = screen.getByLabelText("Password");
    fireEvent.blur(password);

    await screen.findByText("Password is required.");

    fireEvent.change(password, { target: { value: "password123" } });

    await waitFor(() => {
      expect(screen.queryByText("Password is required.")).not.toBeInTheDocument();
      expect(password).not.toHaveAttribute("aria-invalid", "true");
    });
  });
});
