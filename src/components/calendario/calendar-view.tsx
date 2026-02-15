"use client";

import { useMemo, useRef, useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DoctorSlot } from "@/db/schema";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { getAvailableSlotsInRange } from "@/actions/slots";
import { getAppointments } from "@/actions/appointments";
import {
  CALENDAR_ROW_HEIGHT,
  CALENDAR_SLOT_INTERVAL_MINUTES,
  DayColumn,
} from "./day-column";
import { MonthGrid } from "./month-grid";
import { SlotDetailDialog } from "./slot-detail-dialog";
import { AddSlotsDialog, type AddSlotsMode } from "./add-slots-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewType = "day" | "week" | "month";
type HoursMode = "business" | "all";

function isHoursMode(value: string | null): value is HoursMode {
  return value === "business" || value === "all";
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

function formatDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateParam(param: string): Date | null {
  const parts = param.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

export function CalendarView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize from URL params
  const initialView = (searchParams.get("view") as ViewType) || "week";
  const initialDateParam = searchParams.get("date");
  const initialDate = initialDateParam ? parseDateParam(initialDateParam) : new Date();
  const rawHours = searchParams.get("hours");
  const initialHours: HoursMode = isHoursMode(rawHours) ? rawHours : "business";

  const [view, setView] = useState<ViewType>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate || new Date());
  const [hoursMode, setHoursMode] = useState<HoursMode>(initialHours);
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [appointments, setAppointments] = useState<Map<string, AppointmentWithDetails>>(
    new Map()
  );
  const [isPending, startTransition] = useTransition();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Detail dialog state
  const [selectedSlot, setSelectedSlot] = useState<DoctorSlot | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);

  // Add dialog state
  const [addDate, setAddDate] = useState<Date | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddSlotsMode>("bulk");
  const [addRange, setAddRange] = useState<{ startMinutes: number; endMinutes: number } | null>(
    null
  );

  // Update URL when view or date changes
  const updateUrl = useCallback((newView: ViewType, newDate: Date, newHours: HoursMode) => {
    const params = new URLSearchParams();
    params.set("view", newView);
    params.set("date", formatDateParam(newDate));
    params.set("hours", newHours);
    router.replace(`/agenda?${params.toString()}`, { scroll: false });
  }, [router]);

  const getDateRange = useCallback(() => {
    let start: Date, end: Date;

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
  }, [view, currentDate]);

  const loadData = useCallback(async () => {
    const { start, end } = getDateRange();

    const [slotsData, appointmentsData] = await Promise.all([
      getAvailableSlotsInRange(start, end),
      getAppointments(),
    ]);

    startTransition(() => {
      setSlots(slotsData);
      const appointmentMap = new Map<string, AppointmentWithDetails>();
      for (const apt of appointmentsData) {
        appointmentMap.set(apt.slotId, apt);
      }
      setAppointments(appointmentMap);
      setIsInitialLoad(false);
    });
  }, [getDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loading = isInitialLoad || isPending;

  const handleViewChange = (newView: ViewType) => {
    setView(newView);
    updateUrl(newView, currentDate, hoursMode);
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(newDate.getDate() - 1);
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
    updateUrl(view, newDate, hoursMode);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    updateUrl(view, newDate, hoursMode);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    updateUrl(view, today, hoursMode);
  };

  const handleSlotClick = (slot: DoctorSlot, appointment?: AppointmentWithDetails) => {
    setSelectedSlot(slot);
    setSelectedAppointment(appointment);
    setDetailOpen(true);
  };

  const handleAddClick = (date: Date) => {
    setAddMode("bulk");
    setAddRange(null);
    setAddDate(date);
    setAddOpen(true);
  };

  const handleTimeClick = (date: Date, startMinutes: number, endMinutes: number) => {
    setAddMode("single");
    setAddRange({ startMinutes, endMinutes });
    setAddDate(date);
    setAddOpen(true);
  };

  const handleCreateRange = (date: Date, startMinutes: number, endMinutes: number) => {
    setAddMode("range");
    setAddRange({ startMinutes, endMinutes });
    setAddDate(date);
    setAddOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
    updateUrl("day", date, hoursMode);
  };

  const formatTitle = () => {
    if (view === "day") {
      return new Intl.DateTimeFormat("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(currentDate);
    } else if (view === "week") {
      const weekStart = getMonday(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startStr = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(weekStart);
      const endStr = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" }).format(weekEnd);
      return `${startStr} - ${endStr}`;
    } else {
      return new Intl.DateTimeFormat("it-IT", {
        month: "long",
        year: "numeric",
      }).format(currentDate);
    }
  };

  const getDays = () => {
    if (view === "day") {
      return [currentDate];
    } else if (view === "week") {
      const weekStart = getMonday(currentDate);
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        return date;
      });
    }
    return [];
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
    return totalRows * CALENDAR_ROW_HEIGHT;
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

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* View switcher */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(["day", "week", "month"] as ViewType[]).map((v) => (
                <Button
                  key={v}
                  variant={view === v ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleViewChange(v)}
                  className="text-xs"
                >
                  {v === "day" ? "Giorno" : v === "week" ? "Settimana" : "Mese"}
                </Button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {([
                  { value: "business", label: "Business" },
                  { value: "all", label: "Tutto" },
                ] as const).map((option) => (
                  <Button
                    key={option.value}
                    variant={hoursMode === option.value ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setHoursMode(option.value);
                      updateUrl(view, currentDate, option.value);
                    }}
                    className="text-xs"
                    title={
                      option.value === "business"
                        ? "08:00 - 21:00"
                        : "00:00 - 24:00"
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Oggi
              </Button>
              <div className="flex items-center">
                <Button variant="ghost" size="sm" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[200px] text-center font-medium capitalize">
                  {formatTitle()}
                </span>
                <Button variant="ghost" size="sm" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {(view === "day" || view === "week") && (
            <p className="text-xs text-muted-foreground mt-3">
              Clicca una fascia per creare subito 1 slot singolo. Trascina per selezionare un
              intervallo e poi scegli se creare 1 slot unico o piu slot in base alla durata.
              Usa il tasto + per preset mattina/pomeriggio.
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground">
              Caricamento...
            </div>
          ) : view === "month" ? (
            <MonthGrid
              currentDate={currentDate}
              slots={slots}
              appointments={appointments}
              onDayClick={handleDayClick}
              onAddClick={handleAddClick}
            />
          ) : (
            <div className="border-t">
              <div
                ref={scrollContainerRef}
                className="h-[calc(100vh-380px)] min-h-[440px] max-h-[680px] overflow-auto"
              >
                <div
                  className={cn(
                    "grid min-w-[760px]",
                    view === "day"
                      ? "grid-cols-[48px_minmax(240px,1fr)]"
                      : "grid-cols-[48px_repeat(7,minmax(110px,1fr))]"
                  )}
                >
                  <div className="sticky top-0 left-0 z-30 border-r border-b bg-background" />
                  {getDays().map((date) => {
                    const pastDay = isPastDay(date);
                    const isClickable = view === "week";
                    return (
                      <div
                        key={`header-${date.toISOString()}`}
                        data-calendar-day-header
                        role={isClickable ? "button" : undefined}
                        tabIndex={isClickable ? 0 : undefined}
                        className={cn(
                          "sticky top-0 z-20 relative border-r border-b px-2 py-2 text-center bg-background",
                          isClickable && "cursor-pointer transition-colors hover:bg-muted/40",
                          isToday(date) && "bg-primary text-primary-foreground",
                          pastDay && !isToday(date) && "bg-gray-50/70 text-muted-foreground"
                        )}
                        onClick={() => {
                          if (isClickable) {
                            handleDayClick(date);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (!isClickable) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleDayClick(date);
                          }
                        }}
                      >
                        <div className="text-[11px] uppercase leading-none">
                          {formatDayName(date)}
                        </div>
                        <div className="text-lg leading-tight">{date.getDate()}</div>
                        {!pastDay && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "absolute right-1 top-1 h-6 w-6 p-0",
                              isToday(date)
                                ? "hover:bg-primary-foreground/20 text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleAddClick(date);
                            }}
                            title="Aggiungi slot"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
                        style={{ top: index * rowsPerHour * CALENDAR_ROW_HEIGHT - 6 }}
                      >
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    ))}
                  </div>
                  {getDays().map((date) => (
                    <DayColumn
                      key={date.toISOString()}
                      date={date}
                      slots={slots}
                      appointments={appointments}
                      onSlotClick={handleSlotClick}
                      onCreateRange={handleCreateRange}
                      onTimeClick={handleTimeClick}
                      showHeader={false}
                      startHour={startHour}
                      endHour={endHour}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slot Detail Dialog */}
      <SlotDetailDialog
        slot={selectedSlot}
        appointment={selectedAppointment}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={loadData}
      />

      {/* Add Slots Dialog */}
      {addDate && (
        <AddSlotsDialog
          date={addDate}
          open={addOpen}
          mode={addMode}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) {
              setAddDate(null);
              setAddRange(null);
              setAddMode("bulk");
            }
          }}
          onCreated={loadData}
          initialStartMinutes={addRange?.startMinutes}
          initialEndMinutes={addRange?.endMinutes}
        />
      )}
    </>
  );
}
