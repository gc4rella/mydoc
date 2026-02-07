import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { CalendarView } from "@/components/calendario/calendar-view";

vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      replace: vi.fn(),
    }),
    useSearchParams: () =>
      new URLSearchParams("view=week&date=2026-02-02&hours=business"),
  };
});

const getAvailableSlotsInRangeMock = vi.fn();
vi.mock("@/actions/slots", () => {
  return {
    getAvailableSlotsInRange: (...args: unknown[]) => getAvailableSlotsInRangeMock(...args),
  };
});

const getAppointmentsMock = vi.fn();
vi.mock("@/actions/appointments", () => {
  return {
    getAppointments: (...args: unknown[]) => getAppointmentsMock(...args),
  };
});

describe("CalendarView", () => {
  let dateNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dateNowSpy = vi
      .spyOn(Date, "now")
      .mockReturnValue(new Date(2026, 1, 2, 6, 0, 0).getTime());
    getAvailableSlotsInRangeMock.mockReset().mockResolvedValue([]);
    getAppointmentsMock.mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  it("does not render nested buttons in the day headers (prevents hydration errors)", async () => {
    render(<CalendarView />);

    await waitFor(() => expect(getAvailableSlotsInRangeMock).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const headers = document.querySelectorAll("[data-calendar-day-header]");
      expect(headers.length).toBe(7);
    });

    // invalid HTML: <button><button/></button>
    expect(document.querySelector("button button")).toBeNull();
  });
});
