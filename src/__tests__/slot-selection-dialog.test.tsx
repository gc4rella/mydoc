import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { SlotSelectionDialog } from "@/components/appuntamenti/slot-selection-dialog";

vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      refresh: vi.fn(),
    }),
  };
});

const getAvailableSlotsInRangeMock = vi.fn();
vi.mock("@/actions/slots", () => {
  return {
    getAvailableSlotsInRange: (...args: unknown[]) => getAvailableSlotsInRangeMock(...args),
  };
});

describe("SlotSelectionDialog", () => {
  const RealDate = Date;
  const fixedNow = new RealDate(2026, 1, 2, 6, 0, 0);

  beforeEach(() => {
    getAvailableSlotsInRangeMock.mockReset();

    // Keep real timers (Testing Library waitFor/findByText rely on them) but fix "now".
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Date = class extends RealDate {
      constructor(...args: ConstructorParameters<typeof RealDate>) {
        if (args.length === 0) {
          return new RealDate(fixedNow);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new RealDate(...(args as any));
      }

      static now() {
        return fixedNow.getTime();
      }
    } as unknown as DateConstructor;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Date = RealDate;
  });

  it("renders 7 day headers in week view and can navigate weeks", async () => {
    const now = new Date();
    const slotStart = new Date(now);
    slotStart.setHours(9, 0, 0, 0);
    const slotEnd = new Date(now);
    slotEnd.setHours(9, 30, 0, 0);

    getAvailableSlotsInRangeMock.mockResolvedValue([
      {
        id: "slot-1",
        startTime: slotStart,
        endTime: slotEnd,
        durationMinutes: 30,
        isAvailable: true,
        note: null,
        createdAt: now,
      },
    ]);

    render(
      <SlotSelectionDialog
        title="Prenota Appuntamento"
        trigger={<button type="button">Apri</button>}
        infoPanel={<div>Info</div>}
        emptyState={<div>Empty</div>}
        successMessage="OK"
        onSelectSlot={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Apri" }));
    await screen.findByText("Prenota Appuntamento");

    await waitFor(() => expect(getAvailableSlotsInRangeMock).toHaveBeenCalledTimes(1));

    // Wait for at least one slot block to render (ensures we are past loading/empty state).
    await screen.findByText("09:00 - 09:30");

    await waitFor(() => {
      const headers = document.querySelectorAll("[data-calendar-day-header]");
      expect(headers.length).toBe(7);
    });

    const prev = screen.getByRole("button", { name: "Periodo precedente" });
    const next = screen.getByRole("button", { name: "Periodo successivo" });

    fireEvent.click(next);
    await waitFor(() => expect(getAvailableSlotsInRangeMock).toHaveBeenCalledTimes(2));

    const firstCallStart = getAvailableSlotsInRangeMock.mock.calls[0]?.[0] as Date;
    const secondCallStart = getAvailableSlotsInRangeMock.mock.calls[1]?.[0] as Date;

    expect(firstCallStart.getFullYear()).toBe(2026);
    expect(firstCallStart.getMonth()).toBe(1);
    expect(firstCallStart.getDate()).toBe(2);

    expect(secondCallStart.getFullYear()).toBe(2026);
    expect(secondCallStart.getMonth()).toBe(1);
    expect(secondCallStart.getDate()).toBe(9);

    fireEvent.click(prev);
    await waitFor(() => expect(getAvailableSlotsInRangeMock).toHaveBeenCalledTimes(3));
  });
});
