"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { DoctorSlot } from "@/db/schema";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { getAvailableSlotsInRange, getNextAvailableSlot } from "@/actions/slots";
import {
  CALENDAR_SLOT_INTERVAL_MINUTES,
  DayColumn,
} from "@/components/calendario/day-column";
import { MonthGrid } from "@/components/calendario/month-grid";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type ViewType = "day" | "week" | "month";
type HoursMode = "business" | "all";

const BOOKING_ROW_HEIGHT = 24;

interface SlotSelectionDialogProps {
  title: string;
  trigger: ReactNode;
  infoPanel: ReactNode;
  emptyState: ReactNode;
  successMessage: string;
  confirmSelectionTitle?: string;
  confirmSelectionDescription?: string;
  confirmSelectionLabel?: string;
  onSelectSlot: (slot: DoctorSlot) => Promise<{ error?: string } | void>;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDateRange(view: ViewType, currentDate: Date) {
  let start: Date;
  let end: Date;

  if (view === "day") {
    start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(currentDate);
    end.setHours(23, 59, 59, 999);
  } else if (view === "week") {
    start = getMonday(currentDate);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else {
    start = getMonthStart(currentDate);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  }

  return { start, end };
}

export function SlotSelectionDialog({
  title,
  trigger,
  infoPanel,
  emptyState,
  successMessage,
  confirmSelectionTitle = "Confermare slot?",
  confirmSelectionDescription = "Verifica i dettagli dello slot selezionato prima di confermare.",
  confirmSelectionLabel = "Conferma slot",
  onSelectSlot,
}: SlotSelectionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewType>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [hoursMode, setHoursMode] = useState<HoursMode>("business");
  const [availableSlots, setAvailableSlots] = useState<DoctorSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingSlotId, setSubmittingSlotId] = useState<string | null>(null);
  const [slotToConfirm, setSlotToConfirm] = useState<DoctorSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const requestCounter = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pendingScrollSlotIdRef = useRef<string | null>(null);
  const didAutoScrollRef = useRef(false);

  const emptyAppointments = useMemo(
    () => new Map<string, AppointmentWithDetails>(),
    []
  );

  const isMobile = () => {
    if (typeof window === "undefined") return false;
    if (typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  };

  const resetAutoScroll = () => {
    didAutoScrollRef.current = false;
    pendingScrollSlotIdRef.current = null;
  };

  const loadSlotsFor = async (targetView: ViewType, targetDate: Date) => {
    const requestId = ++requestCounter.current;
    setLoading(true);
    setError(null);

    const { start, end } = getDateRange(targetView, targetDate);
    const slots = await getAvailableSlotsInRange(start, end);
    if (requestId !== requestCounter.current) {
      return;
    }

    const now = new Date();
    const futureAvailable = slots.filter((slot) => slot.isAvailable && slot.startTime > now);
    pendingScrollSlotIdRef.current = futureAvailable[0]?.id ?? null;

    setAvailableSlots(futureAvailable);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    if (loading) return;
    if (view === "month") return;
    if (didAutoScrollRef.current) return;

    const slotId = pendingScrollSlotIdRef.current;
    if (!slotId) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const escaped =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(slotId)
        : slotId;

    const el = container.querySelector(
      `[data-slot-item="true"][data-slot-id="${escaped}"]`
    ) as HTMLElement | null;
    if (!el) return;

    // Center the earliest slot in view (helps on small screens where not all days are visible).
    if (typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "center", inline: "center" });
    }
    didAutoScrollRef.current = true;
  }, [availableSlots, loading, open, view]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      requestCounter.current += 1;
      setSubmittingSlotId(null);
      setSlotToConfirm(null);
      return;
    }

    const now = new Date();
    resetAutoScroll();

    const defaultView: ViewType = isMobile() ? "day" : "week";
    setView(defaultView);
    setHoursMode("business");
    setSuccess(false);
    setError(null);
    setSubmittingSlotId(null);
    setSlotToConfirm(null);

    // If availability exists only in the future (e.g. next week), defaulting to "now" makes the
    // booking dialog look empty and misleading. Jump to the next available slot when possible.
    void (async () => {
      const nextSlot = await getNextAvailableSlot();
      const targetDate = nextSlot?.startTime ?? now;
      setCurrentDate(targetDate);
      await loadSlotsFor(defaultView, targetDate);
    })();
  };

  const handlePrev = () => {
    resetAutoScroll();
    const nextDate = new Date(currentDate);
    if (view === "day") {
      nextDate.setDate(nextDate.getDate() - 1);
    } else if (view === "week") {
      nextDate.setDate(nextDate.getDate() - 7);
    } else {
      nextDate.setMonth(nextDate.getMonth() - 1);
    }
    setCurrentDate(nextDate);
    void loadSlotsFor(view, nextDate);
  };

  const handleNext = () => {
    resetAutoScroll();
    const nextDate = new Date(currentDate);
    if (view === "day") {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (view === "week") {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    setCurrentDate(nextDate);
    void loadSlotsFor(view, nextDate);
  };

  const handleToday = () => {
    resetAutoScroll();
    const today = new Date();
    setCurrentDate(today);
    void loadSlotsFor(view, today);
  };

  const handleViewChange = (nextView: ViewType) => {
    resetAutoScroll();
    setView(nextView);
    void loadSlotsFor(nextView, currentDate);
  };

  const handleDayClick = (date: Date) => {
    resetAutoScroll();
    setCurrentDate(date);
    setView("day");
    void loadSlotsFor("day", date);
  };

  const handleSelect = async (slot: DoctorSlot) => {
    if (submittingSlotId) return;
    if (loading) return;

    setSubmittingSlotId(slot.id);
    setError(null);

    try {
      const result = await onSelectSlot(slot);
      if (result?.error) {
        setSubmittingSlotId(null);
        return { error: result.error };
      }

      setSuccess(true);
      setSlotToConfirm(null);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setSubmittingSlotId(null);
        router.refresh();
      }, 1000);
      return { success: true };
    } catch {
      const message = "Errore imprevisto durante la prenotazione. Riprova.";
      setSubmittingSlotId(null);
      return { error: message };
    }
  };

  const handleSlotClick = (slot: DoctorSlot) => {
    if (submittingSlotId) return;
    if (loading) return;
    setError(null);
    setSlotToConfirm(slot);
  };

  const formatTitle = () => {
    if (view === "day") {
      return new Intl.DateTimeFormat("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(currentDate);
    }

    if (view === "week") {
      const weekStart = getMonday(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startStr = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(
        weekStart
      );
      const endStr = new Intl.DateTimeFormat("it-IT", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(weekEnd);
      return `${startStr} - ${endStr}`;
    }

    return new Intl.DateTimeFormat("it-IT", {
      month: "long",
      year: "numeric",
    }).format(currentDate);
  };

  const days = () => {
    if (view === "day") {
      return [currentDate];
    }
    const weekStart = getMonday(currentDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      return date;
    });
  };

  const { startHour, endHour } = useMemo(() => {
    if (hoursMode === "business") {
      return { startHour: 8, endHour: 21 };
    }
    return { startHour: 0, endHour: 24 };
  }, [hoursMode]);

  const hours = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, index) => startHour + index),
    [endHour, startHour]
  );
  const rowsPerHour = 60 / CALENDAR_SLOT_INTERVAL_MINUTES;

  const timelineHeight = useMemo(() => {
    const totalRows = ((endHour - startHour) * 60) / CALENDAR_SLOT_INTERVAL_MINUTES;
    return totalRows * BOOKING_ROW_HEIGHT;
  }, [endHour, startHour]);

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isPastDay = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const formatDayName = (date: Date) =>
    new Intl.DateTimeFormat("it-IT", { weekday: "short" }).format(date);

  const interactionDisabled = Boolean(submittingSlotId) || loading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-6xl h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Seleziona uno slot dal calendario e conferma nella finestra di riepilogo.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 sm:px-6 pb-5 overflow-hidden flex-1 flex flex-col min-h-0 gap-3">
          <div className="rounded-lg border overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="p-3 border-b grid gap-3 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-start">
              <div className="min-w-0">{infoPanel}</div>

              <div className="min-w-0 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                    {(["day", "week", "month"] as ViewType[]).map((variant) => (
                      <Button
                        key={variant}
                        variant={view === variant ? "default" : "ghost"}
                        size="sm"
                        disabled={interactionDisabled}
                        onClick={() => handleViewChange(variant)}
                      >
                        {variant === "day"
                          ? "Giorno"
                          : variant === "week"
                            ? "Settimana"
                            : "Mese"}
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                    {([
                      { value: "business", label: "Business" },
                      { value: "all", label: "Tutto" },
                    ] as const).map((option) => (
                      <Button
                        key={option.value}
                        variant={hoursMode === option.value ? "default" : "ghost"}
                        size="sm"
                        disabled={interactionDisabled}
                        onClick={() => setHoursMode(option.value)}
                        className="text-xs"
                        title={option.value === "business" ? "08:00 - 21:00" : "00:00 - 24:00"}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToday}
                      disabled={interactionDisabled}
                    >
                      Oggi
                    </Button>
                    <div className="grid grid-cols-[auto_minmax(140px,1fr)_auto] items-center gap-1 w-full sm:w-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePrev}
                        disabled={interactionDisabled}
                        aria-label="Periodo precedente"
                        title="Periodo precedente"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="min-w-0 text-center text-sm font-medium capitalize truncate px-1">
                        {formatTitle()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNext}
                        disabled={interactionDisabled}
                        aria-label="Periodo successivo"
                        title="Periodo successivo"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Seleziona uno slot dal calendario, poi conferma nella finestra dedicata.
                </p>
              </div>
            </div>

            {success ? (
              <div className="flex-1 flex items-center justify-center text-green-600">
                {successMessage}
              </div>
            ) : (
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-auto"
                aria-busy={interactionDisabled}
              >
                {loading ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Caricamento...
                  </div>
                ) : (
                  <div className="relative h-full">
                    {view === "month" ? (
                      <MonthGrid
                        currentDate={currentDate}
                        slots={availableSlots}
                        appointments={emptyAppointments}
                        onDayClick={handleDayClick}
                      />
                    ) : (
                      <div className="touch-pan-x touch-pan-y">
                        <div
                          className={cn(
                            "grid w-full",
                            view === "day" ? "min-w-[360px]" : "min-w-[760px]",
                            view === "day"
                              ? "grid-cols-[48px_minmax(240px,1fr)]"
                              : "grid-cols-[48px_repeat(7,minmax(110px,1fr))]"
                          )}
                        >
                          <div className="sticky top-0 left-0 z-30 border-r border-b bg-background" />
                          {days().map((date) => {
                            const pastDay = isPastDay(date);
                            const isClickable = view === "week";
                            return (
                              <div
                                key={`header-${date.toISOString()}`}
                                data-calendar-day-header
                                className={cn(
                                  "sticky top-0 z-20 border-r border-b px-2 py-2 text-center bg-background",
                                  isClickable &&
                                    !interactionDisabled &&
                                    "cursor-pointer transition-colors hover:bg-muted/40",
                                  isToday(date) && "bg-primary text-primary-foreground",
                                  pastDay && !isToday(date) && "bg-gray-50/70 text-muted-foreground"
                                )}
                                onClick={() => {
                                  if (interactionDisabled) return;
                                  if (isClickable) {
                                    handleDayClick(date);
                                  }
                                }}
                              >
                                <div className="text-[11px] uppercase leading-none">
                                  {formatDayName(date)}
                                </div>
                                <div className="text-lg leading-tight">{date.getDate()}</div>
                              </div>
                            );
                          })}

                          <div
                            className="sticky left-0 z-10 relative border-r bg-muted/20"
                            style={{ height: timelineHeight }}
                          >
                            {hours.map((hour, index) => (
                              <span
                                key={hour}
                                className="absolute left-1 text-[10px] text-muted-foreground"
                                style={{ top: index * rowsPerHour * BOOKING_ROW_HEIGHT - 6 }}
                              >
                                {String(hour).padStart(2, "0")}:00
                              </span>
                            ))}
                          </div>
                          {days().map((date) => (
                            <DayColumn
                              key={date.toISOString()}
                              date={date}
                              slots={availableSlots}
                              appointments={emptyAppointments}
                              onSlotClick={(slot) => {
                                handleSlotClick(slot);
                              }}
                              showHeader={false}
                              startHour={startHour}
                              endHour={endHour}
                              rowHeight={BOOKING_ROW_HEIGHT}
                              interactionDisabled={interactionDisabled}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {availableSlots.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
                        <div className="max-w-sm rounded-lg border bg-background/90 p-4 text-center text-muted-foreground shadow-sm">
                          {emptyState}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {submittingSlotId && (
            <p className="text-sm text-muted-foreground">Prenotazione in corso...</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>

      <ConfirmationDialog
        open={Boolean(slotToConfirm)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSlotToConfirm(null);
        }}
        title={confirmSelectionTitle}
        description={confirmSelectionDescription}
        confirmLabel={confirmSelectionLabel}
        loadingLabel="Conferma in corso..."
        onConfirm={() => {
          if (!slotToConfirm) return;
          return handleSelect(slotToConfirm);
        }}
      >
        {slotToConfirm && (
          <div className="rounded-lg border p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Slot selezionato
            </div>
            <div className="mt-2 font-medium">
              {formatDateTime(slotToConfirm.startTime, {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(slotToConfirm.startTime, {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              -{" "}
              {formatDateTime(slotToConfirm.endTime, {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              ({slotToConfirm.durationMinutes} min)
            </div>
          </div>
        )}
      </ConfirmationDialog>
    </Dialog>
  );
}
