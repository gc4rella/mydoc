"use client";

import type { DoctorSlot } from "@/db/schema";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface MonthGridProps {
  currentDate: Date;
  slots: DoctorSlot[];
  appointments: Map<string, AppointmentWithDetails>;
  onDayClick?: (date: Date) => void;
  onAddClick?: (date: Date) => void;
}

export function MonthGrid({
  currentDate,
  slots,
  appointments,
  onDayClick,
  onAddClick,
}: MonthGridProps) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and how many days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Get what day of week the month starts (0 = Sunday, 1 = Monday, etc)
  let startDayOfWeek = firstDay.getDay();
  // Convert to Monday-first (0 = Monday, 6 = Sunday)
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  // Count slots per day
  const slotsByDay = new Map<string, { available: number; booked: number }>();
  for (const slot of slots) {
    const dateKey = slot.startTime.toDateString();
    const current = slotsByDay.get(dateKey) || { available: 0, booked: 0 };
    if (slot.isAvailable) {
      current.available++;
    } else if (appointments.has(slot.id)) {
      current.booked++;
    }
    slotsByDay.set(dateKey, current);
  }

  const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  // Build calendar grid
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  // Add empty cells for days before the 1st
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(new Date(year, month, day));
  }

  // Fill remaining cells in last week
  while (currentWeek.length < 7) {
    currentWeek.push(null);
  }
  weeks.push(currentWeek);

  const isToday = (date: Date) => {
    return date.getTime() === today.getTime();
  };

  const isPast = (date: Date) => {
    return date < today;
  };

  return (
    <div className="border-t">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center py-2 text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
          {week.map((date, dayIndex) => {
            if (!date) {
              return (
                <div
                  key={`empty-${dayIndex}`}
                  className="h-24 border-r last:border-r-0 bg-gray-50/50"
                />
              );
            }

            const dateKey = date.toDateString();
            const dayCounts = slotsByDay.get(dateKey);
            const past = isPast(date);

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "h-24 border-r last:border-r-0 p-1 relative group",
                  past && "bg-gray-50/50",
                  !past && "hover:bg-muted/50 cursor-pointer"
                )}
                onClick={() => !past && onDayClick?.(date)}
              >
                {/* Day number */}
                <div
                  className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                    isToday(date) && "bg-primary text-primary-foreground",
                    past && !isToday(date) && "text-muted-foreground"
                  )}
                >
                  {date.getDate()}
                </div>

                {/* Slot counts */}
                {dayCounts && (
                  <div className="mt-1 space-y-0.5">
                    {dayCounts.available > 0 && (
                      <div className="text-[10px] px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded truncate">
                        {dayCounts.available} disponibil{dayCounts.available === 1 ? "e" : "i"}
                      </div>
                    )}
                    {dayCounts.booked > 0 && (
                      <div className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded truncate">
                        {dayCounts.booked} prenotat{dayCounts.booked === 1 ? "o" : "i"}
                      </div>
                    )}
                  </div>
                )}

                {/* Add button */}
                {!past && onAddClick && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddClick(date);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
