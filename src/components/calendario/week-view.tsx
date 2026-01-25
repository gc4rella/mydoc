"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import type { DoctorSlot } from "@/db/schema";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { getAvailableSlotsInRange } from "@/actions/slots";
import { getAppointments } from "@/actions/appointments";
import { WeekNavigation } from "./week-navigation";
import { DayColumn } from "./day-column";
import { SlotDetailDialog } from "./slot-detail-dialog";
import { AddSlotsDialog } from "./add-slots-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function WeekView() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
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

  const loadData = useCallback(async () => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [slotsData, appointmentsData] = await Promise.all([
      getAvailableSlotsInRange(weekStart, weekEnd),
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
  }, [weekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loading = isInitialLoad || isPending;

  const handlePrevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const handleNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const handleToday = () => {
    setWeekStart(getMonday(new Date()));
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

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <WeekNavigation
            weekStart={weekStart}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            onToday={handleToday}
          />
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground">
              Caricamento...
            </div>
          ) : (
            <div className="grid grid-cols-7 border-t">
              {days.map((date) => (
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
