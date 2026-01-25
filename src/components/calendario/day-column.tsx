"use client";

import type { DoctorSlot } from "@/db/schema";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { SlotCard } from "./slot-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface DayColumnProps {
  date: Date;
  slots: DoctorSlot[];
  appointments: Map<string, AppointmentWithDetails>;
  onSlotClick?: (slot: DoctorSlot, appointment?: AppointmentWithDetails) => void;
  onAddClick?: (date: Date) => void;
}

export function DayColumn({ date, slots, appointments, onSlotClick, onAddClick }: DayColumnProps) {
  const now = new Date();

  const isToday = () => {
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const isPastDay = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const formatDayName = (d: Date) => {
    return new Intl.DateTimeFormat("it-IT", { weekday: "short" }).format(d);
  };

  const formatDayNumber = (d: Date) => {
    return new Intl.DateTimeFormat("it-IT", { day: "numeric" }).format(d);
  };

  const daySlots = slots.filter((slot) => {
    const slotDate = new Date(slot.startTime);
    return (
      slotDate.getDate() === date.getDate() &&
      slotDate.getMonth() === date.getMonth() &&
      slotDate.getFullYear() === date.getFullYear()
    );
  });

  // Sort slots by start time
  daySlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const pastDay = isPastDay();

  return (
    <div className={cn(
      "flex flex-col border-r last:border-r-0 min-w-0",
      pastDay && "bg-gray-50/50"
    )}>
      {/* Header */}
      <div
        className={cn(
          "text-center py-2 border-b font-medium relative",
          isToday() && "bg-primary text-primary-foreground",
          pastDay && !isToday() && "text-muted-foreground"
        )}
      >
        <div className="text-xs uppercase">{formatDayName(date)}</div>
        <div className="text-lg">{formatDayNumber(date)}</div>

        {/* Add button for future days */}
        {!pastDay && onAddClick && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0",
              isToday() ? "hover:bg-primary-foreground/20 text-primary-foreground" : "hover:bg-muted"
            )}
            onClick={() => onAddClick(date)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Slots */}
      <div className="flex-1 p-1 space-y-1 min-h-[400px] overflow-y-auto">
        {daySlots.length === 0 ? (
          <div
            className={cn(
              "h-full flex flex-col items-center justify-center text-muted-foreground",
              !pastDay && onAddClick && "cursor-pointer hover:bg-muted/50 rounded-md transition-colors"
            )}
            onClick={!pastDay && onAddClick ? () => onAddClick(date) : undefined}
          >
            {pastDay ? (
              <span className="text-xs">-</span>
            ) : (
              <>
                <Plus className="h-5 w-5 mb-1 opacity-30" />
                <span className="text-xs">Aggiungi</span>
              </>
            )}
          </div>
        ) : (
          daySlots.map((slot) => {
            const isPastSlot = slot.endTime < now;
            return (
              <SlotCard
                key={slot.id}
                slot={slot}
                appointment={appointments.get(slot.id)}
                isPast={isPastSlot}
                onClick={() => onSlotClick?.(slot, appointments.get(slot.id))}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
