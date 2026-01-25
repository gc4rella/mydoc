"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DoctorSlot } from "@/db/schema";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { getAvailableSlotsInRange } from "@/actions/slots";
import { getAppointments } from "@/actions/appointments";
import { DayColumn } from "./day-column";
import { MonthGrid } from "./month-grid";
import { SlotDetailDialog } from "./slot-detail-dialog";
import { AddSlotsDialog } from "./add-slots-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewType = "day" | "week" | "month";

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

  // Initialize from URL params
  const initialView = (searchParams.get("view") as ViewType) || "week";
  const initialDateParam = searchParams.get("date");
  const initialDate = initialDateParam ? parseDateParam(initialDateParam) : new Date();

  const [view, setView] = useState<ViewType>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate || new Date());
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

  // Update URL when view or date changes
  const updateUrl = useCallback((newView: ViewType, newDate: Date) => {
    const params = new URLSearchParams();
    params.set("view", newView);
    params.set("date", formatDateParam(newDate));
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
    updateUrl(newView, currentDate);
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
    updateUrl(view, newDate);
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
    updateUrl(view, newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    updateUrl(view, today);
  };

  const handleSlotClick = (slot: DoctorSlot, appointment?: AppointmentWithDetails) => {
    setSelectedSlot(slot);
    setSelectedAppointment(appointment);
    setDetailOpen(true);
  };

  const handleAddClick = (date: Date) => {
    setAddDate(date);
    setAddOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
    updateUrl("day", date);
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
            <div className={cn(
              "grid border-t",
              view === "day" ? "grid-cols-1" : "grid-cols-7"
            )}>
              {getDays().map((date) => (
                <DayColumn
                  key={date.toISOString()}
                  date={date}
                  slots={slots}
                  appointments={appointments}
                  onSlotClick={handleSlotClick}
                  onAddClick={handleAddClick}
                />
              ))}
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
          onOpenChange={setAddOpen}
          onCreated={loadData}
        />
      )}
    </>
  );
}
