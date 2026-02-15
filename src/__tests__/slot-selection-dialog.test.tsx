import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

import { SlotSelectionDialog } from "@/components/appuntamenti/slot-selection-dialog";

vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      refresh: vi.fn(),
    }),
  };
});

const getAvailableSlotsInRangeMock = vi.fn();
const getNextAvailableSlotMock = vi.fn();
vi.mock("@/actions/slots", () => {
  return {
    getAvailableSlotsInRange: (...args: unknown[]) => getAvailableSlotsInRangeMock(...args),
    getNextAvailableSlot: (...args: unknown[]) => getNextAvailableSlotMock(...args),
  };
});

describe("SlotSelectionDialog", () => {
  const RealDate = Date;
  const fixedNow = new RealDate(2026, 1, 2, 6, 0, 0);

  const makeFutureSlot = (id = "slot-1") => {
    const now = new Date();
    const slotStart = new Date(now);
    slotStart.setHours(9, 0, 0, 0);
    const slotEnd = new Date(now);
    slotEnd.setHours(9, 30, 0, 0);

    return {
      id,
      startTime: slotStart,
      endTime: slotEnd,
      durationMinutes: 30,
      isAvailable: true,
      note: null,
      createdAt: now,
    };
  };

  beforeEach(() => {
    getAvailableSlotsInRangeMock.mockReset();
    getNextAvailableSlotMock.mockReset();
    getNextAvailableSlotMock.mockResolvedValue(undefined);

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
    cleanup();
  });

  it("renders 7 day headers in week view and can navigate weeks", async () => {
    getAvailableSlotsInRangeMock.mockResolvedValue([makeFutureSlot("slot-1")]);

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

  it("defaults to day view on small screens", async () => {
    const realMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("max-width: 640px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      getAvailableSlotsInRangeMock.mockResolvedValue([]);

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

      await waitFor(() => {
        const headers = document.querySelectorAll("[data-calendar-day-header]");
        expect(headers.length).toBe(1);
      });
    } finally {
      window.matchMedia = realMatchMedia;
    }
  });

  it("shows an error and re-enables UI when onSelectSlot throws", async () => {
    getAvailableSlotsInRangeMock.mockResolvedValue([makeFutureSlot("slot-1")]);
    const onSelectSlot = vi.fn().mockRejectedValue(new Error("boom"));

    render(
      <SlotSelectionDialog
        title="Prenota Appuntamento"
        trigger={<button type="button">Apri</button>}
        infoPanel={<div>Info</div>}
        emptyState={<div>Empty</div>}
        successMessage="OK"
        onSelectSlot={onSelectSlot}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Apri" }));
    await screen.findByText("Prenota Appuntamento");
    await screen.findByText("09:00 - 09:30");

    fireEvent.click(screen.getByRole("button", { name: /09:00 - 09:30/i }));
    fireEvent.click(screen.getByRole("button", { name: /Conferma slot/i }));

    await screen.findByText(/Errore imprevisto durante la prenotazione/i);
    await waitFor(() =>
      expect(screen.queryByText("Prenotazione in corso...")).toBeNull()
    );
  });

  it("shows returned error and allows retry", async () => {
    getAvailableSlotsInRangeMock.mockResolvedValue([makeFutureSlot("slot-1")]);
    const onSelectSlot = vi.fn().mockResolvedValue({ error: "Slot non disponibile" });

    render(
      <SlotSelectionDialog
        title="Prenota Appuntamento"
        trigger={<button type="button">Apri</button>}
        infoPanel={<div>Info</div>}
        emptyState={<div>Empty</div>}
        successMessage="OK"
        onSelectSlot={onSelectSlot}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Apri" }));
    await screen.findByText("Prenota Appuntamento");
    await screen.findByText("09:00 - 09:30");

    fireEvent.click(screen.getByRole("button", { name: /09:00 - 09:30/i }));
    fireEvent.click(screen.getByRole("button", { name: /Conferma slot/i }));
    await screen.findByText("Slot non disponibile");

    await waitFor(() =>
      expect(screen.queryByText("Prenotazione in corso...")).toBeNull()
    );

    fireEvent.click(screen.getByRole("button", { name: /Conferma slot/i }));
    await waitFor(() => expect(onSelectSlot).toHaveBeenCalledTimes(2));
  });

  it("closes after successful selection", async () => {
    getAvailableSlotsInRangeMock.mockResolvedValue([makeFutureSlot("slot-1")]);
    const onSelectSlot = vi.fn().mockResolvedValue(undefined);

    render(
      <SlotSelectionDialog
        title="Prenota Appuntamento"
        trigger={<button type="button">Apri</button>}
        infoPanel={<div>Info</div>}
        emptyState={<div>Empty</div>}
        successMessage="OK"
        onSelectSlot={onSelectSlot}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Apri" }));
    await screen.findByText("Prenota Appuntamento");
    await screen.findByText("09:00 - 09:30");

    fireEvent.click(screen.getByRole("button", { name: /09:00 - 09:30/i }));
    fireEvent.click(screen.getByRole("button", { name: /Conferma slot/i }));
    await waitFor(() => expect(onSelectSlot).toHaveBeenCalledTimes(1));
    await screen.findByText("Prenotazione in corso...");

    await new Promise((resolve) => setTimeout(resolve, 1100));
    await waitFor(() => expect(screen.queryByText("Prenota Appuntamento")).toBeNull());
  });
});
