import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";

import { RequestList } from "@/components/richieste/request-list";
import { REQUEST_STATUS } from "@/lib/request-status";
import type { AppointmentWithDetails } from "@/actions/appointments";
import type { RequestWithPatient } from "@/actions/richieste";

vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      refresh: vi.fn(),
    }),
  };
});

vi.mock("next/link", () => {
  return {
    default: ({
      href,
      children,
      ...props
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }: any) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  };
});

describe("RequestList hydration", () => {
  const RealDateTimeFormat = Intl.DateTimeFormat;

  const installDateTimeFormatMock = (suffix: string) => {
    // If a component formats without an explicit timeZone, make the output differ
    // between "server" and "client" to surface hydration mismatches in tests.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Intl.DateTimeFormat = function (...args: any[]) {
      const options = args[1] as Intl.DateTimeFormatOptions | undefined;
      const hasTimeZone = Boolean(options?.timeZone);
      const dtf = new RealDateTimeFormat(...args);
      return {
        format: (value: Date | number) => {
          const text = dtf.format(value);
          return hasTimeZone ? text : `${text}__${suffix}`;
        },
      } as unknown as Intl.DateTimeFormat;
    } as unknown as typeof Intl.DateTimeFormat;
  };

  afterEach(() => {
    Intl.DateTimeFormat = RealDateTimeFormat;
  });

  it("does not trigger recoverable hydration errors for appointment date/time", async () => {
    const request = {
      id: "req-1",
      patient: { id: "pat-1", nome: "Giulia", cognome: "Bianchi", telefono: "123" },
      motivo: "Visita",
      note: null,
      urgenza: "media",
      stato: REQUEST_STATUS.SCHEDULED,
      desiredDate: null,
      createdAt: new Date(),
      patientId: "pat-1",
    } as unknown as RequestWithPatient;

    const appointment = {
      id: "apt-1",
      requestId: request.id,
      slot: {
        id: "slot-1",
        startTime: new Date(Date.UTC(2026, 1, 13, 14, 0, 0)),
        endTime: new Date(Date.UTC(2026, 1, 13, 14, 30, 0)),
        durationMinutes: 30,
        isAvailable: false,
        note: null,
        createdAt: new Date(),
      },
    } as unknown as AppointmentWithDetails;

    const element = <RequestList requests={[request]} appointments={[appointment]} />;

    installDateTimeFormatMock("server");
    const html = renderToString(element);

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    installDateTimeFormatMock("client");

    const recoverableErrors: unknown[] = [];
    const root = hydrateRoot(container, element, {
      onRecoverableError: (error) => recoverableErrors.push(error),
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(recoverableErrors).toHaveLength(0);

    root.unmount();
    container.remove();
  });
});

