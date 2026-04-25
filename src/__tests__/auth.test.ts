import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({
    isLoggedIn: false,
    save: vi.fn(),
    destroy: vi.fn(),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

const { login, logout } = await import("@/actions/auth");
const { getSession } = await import("@/lib/session");

describe("auth actions", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("returns error when ADMIN_PASSWORD is not set", async () => {
      delete process.env.ADMIN_PASSWORD;
      const formData = new FormData();
      formData.set("password", "anything");

      const result = await login(undefined, formData);

      expect(result).toEqual({ error: "Configurazione server non valida" });
    });

    it("returns error when password is wrong", async () => {
      process.env.ADMIN_PASSWORD = "correct_password";
      const formData = new FormData();
      formData.set("password", "wrong_password");

      const result = await login(undefined, formData);

      expect(result).toEqual({ error: "Password non valida" });
    });

    it("sets session and redirects when password is correct", async () => {
      process.env.ADMIN_PASSWORD = "correct_password";
      const formData = new FormData();
      formData.set("password", "correct_password");

      const mockSession = {
        isLoggedIn: false,
        save: vi.fn(),
      };
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      await login(undefined, formData);

      expect(mockSession.isLoggedIn).toBe(true);
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/");
    });
  });

  describe("logout", () => {
    it("destroys session and redirects", async () => {
      const mockSession = {
        isLoggedIn: true,
        destroy: vi.fn(),
      };
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      await logout();

      expect(mockSession.destroy).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });
  });
});
