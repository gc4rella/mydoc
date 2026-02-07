"use client";

import { useRef, useState } from "react";
import type { DoctorSlot } from "@/db/schema";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, Plus, User } from "lucide-react";

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const SLOT_INTERVAL_MINUTES = 30;
const DEFAULT_ROW_HEIGHT = 30;

export const CALENDAR_DAY_START_HOUR = DAY_START_HOUR;
export const CALENDAR_DAY_END_HOUR = DAY_END_HOUR;
export const CALENDAR_SLOT_INTERVAL_MINUTES = SLOT_INTERVAL_MINUTES;
export const CALENDAR_ROW_HEIGHT = DEFAULT_ROW_HEIGHT;

interface DayColumnProps {
  date: Date;
  slots: DoctorSlot[];
  appointments: Map<string, AppointmentWithDetails>;
  onSlotClick?: (slot: DoctorSlot, appointment?: AppointmentWithDetails) => void;
  onAddClick?: (date: Date) => void;
  onCreateRange?: (date: Date, startMinutes: number, endMinutes: number) => void;
  showTimeAxis?: boolean;
  showHeader?: boolean;
  startHour?: number;
  endHour?: number;
  rowHeight?: number;
  interactionDisabled?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getMinutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function DayColumn({
  date,
  slots,
  appointments,
  onSlotClick,
  onAddClick,
  onCreateRange,
  showTimeAxis = false,
  showHeader = true,
  startHour = DAY_START_HOUR,
  endHour = DAY_END_HOUR,
  rowHeight = DEFAULT_ROW_HEIGHT,
  interactionDisabled = false,
}: DayColumnProps) {
  const now = new Date();
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dayStartMinutes = startHour * 60;
  const dayEndMinutes = endHour * 60;
  const totalRows = (dayEndMinutes - dayStartMinutes) / SLOT_INTERVAL_MINUTES;
  const timelineHeight = totalRows * rowHeight;

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

  const formatTime = (dateValue: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(dateValue);
  };

  const daySlots = slots
    .filter((slot) => {
      const slotDate = new Date(slot.startTime);
      return (
        slotDate.getDate() === date.getDate() &&
        slotDate.getMonth() === date.getMonth() &&
        slotDate.getFullYear() === date.getFullYear()
      );
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const pastDay = isPastDay();
  const canCreateRange = Boolean(onCreateRange) && !pastDay;

  const getSnappedMinutes = (clientY: number) => {
    if (!gridRef.current) return dayStartMinutes;
    const rect = gridRef.current.getBoundingClientRect();
    const y = clamp(clientY - rect.top, 0, rect.height);
    const row = clamp(Math.floor(y / rowHeight), 0, totalRows);
    return dayStartMinutes + row * SLOT_INTERVAL_MINUTES;
  };

  const startDrag = (clientY: number) => {
    const start = getSnappedMinutes(clientY);
    setDragStart(start);
    setDragEnd(clamp(start + SLOT_INTERVAL_MINUTES, dayStartMinutes, dayEndMinutes));
    setIsDragging(true);
  };

  const updateDrag = (clientY: number) => {
    if (!isDragging || dragStart === null) return;
    const current = getSnappedMinutes(clientY);
    const normalizedEnd =
      current === dragStart
        ? clamp(current + SLOT_INTERVAL_MINUTES, dayStartMinutes, dayEndMinutes)
        : current;
    setDragEnd(normalizedEnd);
  };

  const finalizeDrag = () => {
    if (!isDragging || dragStart === null || dragEnd === null) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const start = Math.min(dragStart, dragEnd);
    let end = Math.max(dragStart, dragEnd);
    if (end - start < SLOT_INTERVAL_MINUTES) {
      end = clamp(start + SLOT_INTERVAL_MINUTES, dayStartMinutes, dayEndMinutes);
    }

    if (end > start) {
      onCreateRange?.(date, start, end);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const selectionStart =
    dragStart !== null && dragEnd !== null ? Math.min(dragStart, dragEnd) : null;
  const selectionEnd =
    dragStart !== null && dragEnd !== null ? Math.max(dragStart, dragEnd) : null;

  const selectionTop =
    selectionStart !== null
      ? ((selectionStart - dayStartMinutes) / SLOT_INTERVAL_MINUTES) * rowHeight
      : 0;
  const selectionHeight =
    selectionStart !== null && selectionEnd !== null
      ? Math.max(
          ((selectionEnd - selectionStart) / SLOT_INTERVAL_MINUTES) * rowHeight,
          rowHeight
        )
      : 0;

  return (
    <div
      className={cn(
        "flex flex-col border-r last:border-r-0 min-w-0",
        pastDay && "bg-gray-50/50"
      )}
    >
      {showHeader && (
        <div
          className={cn(
            "text-center py-2 border-b font-medium relative",
            isToday() && "bg-primary text-primary-foreground",
            pastDay && !isToday() && "text-muted-foreground"
          )}
        >
          <div className="text-xs uppercase">{formatDayName(date)}</div>
          <div className="text-lg">{formatDayNumber(date)}</div>

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
      )}

      <div
        className={cn(
          "relative border-t",
          showTimeAxis ? "pl-9" : "",
          canCreateRange && "cursor-cell"
        )}
        style={{ height: timelineHeight }}
      >
        {showTimeAxis &&
          Array.from({ length: endHour - startHour + 1 }, (_, index) => {
            const hour = startHour + index;
            const top = index * 2 * rowHeight - 6;
            return (
              <span
                key={hour}
                className="absolute left-1 text-[10px] text-muted-foreground"
                style={{ top }}
              >
                {String(hour).padStart(2, "0")}:00
              </span>
            );
          })}

        <div
          ref={gridRef}
          className="absolute inset-0"
          onPointerDown={(event) => {
            if (interactionDisabled) return;
            if (!canCreateRange || event.button !== 0) return;
            const target = event.target as HTMLElement;
            if (target.closest("[data-slot-item='true']")) return;
            startDrag(event.clientY);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (interactionDisabled) return;
            if (!canCreateRange) return;
            updateDrag(event.clientY);
          }}
          onPointerUp={() => {
            if (interactionDisabled) return;
            if (!canCreateRange) return;
            finalizeDrag();
          }}
          onPointerCancel={() => {
            if (interactionDisabled) return;
            if (!canCreateRange) return;
            finalizeDrag();
          }}
          onPointerLeave={() => {
            if (interactionDisabled) return;
            if (!canCreateRange || !isDragging) return;
            finalizeDrag();
          }}
        >
          {Array.from({ length: (dayEndMinutes - dayStartMinutes) / 60 }, (_, index) => (
            <div
              key={`hour-bg-${index}`}
              className={cn(
                "absolute inset-x-0",
                index % 2 === 0 ? "bg-muted/15" : "bg-transparent"
              )}
              style={{ top: index * 2 * rowHeight, height: 2 * rowHeight }}
            />
          ))}

          {Array.from({ length: totalRows + 1 }, (_, index) => (
            <div
              key={index}
              className={cn(
                "absolute left-0 right-0 border-t",
                index % 2 === 0
                  ? "border-muted-foreground/30"
                  : "border-dashed border-muted-foreground/20"
              )}
              style={{ top: index * rowHeight }}
            />
          ))}

          {selectionStart !== null && selectionEnd !== null && (
            <div
              className="absolute left-1 right-1 rounded-md border border-primary/50 bg-primary/20"
              style={{ top: selectionTop, height: selectionHeight }}
            />
          )}

          {daySlots.map((slot) => {
            const slotStartMinutes = getMinutesOfDay(slot.startTime);
            const slotEndMinutes = getMinutesOfDay(slot.endTime);
            if (slotEndMinutes <= dayStartMinutes || slotStartMinutes >= dayEndMinutes) {
              return null;
            }

            const clippedStart = Math.max(slotStartMinutes, dayStartMinutes);
            const clippedEnd = Math.min(slotEndMinutes, dayEndMinutes);

            const top =
              ((clippedStart - dayStartMinutes) / SLOT_INTERVAL_MINUTES) * rowHeight + 2;
            const height = Math.max(
              ((clippedEnd - clippedStart) / SLOT_INTERVAL_MINUTES) * rowHeight - 4,
              24
            );

            const isPastSlot = slot.endTime < now;
            const appointment = appointments.get(slot.id);
            const isBooked = !slot.isAvailable && appointment;

            const isDisabled = interactionDisabled || isPastSlot;

            return (
              <button
                key={slot.id}
                type="button"
                data-slot-item="true"
                data-slot-id={slot.id}
                className={cn(
                  "absolute left-1.5 right-1.5 rounded-md border px-1.5 py-1 text-left text-[11px] transition-colors shadow-sm",
                  isPastSlot &&
                    "cursor-default border-gray-200 bg-gray-100 text-gray-400",
                  !isPastSlot &&
                    isBooked &&
                    "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-l-[3px] border-l-emerald-500",
                  !isPastSlot &&
                    slot.isAvailable &&
                    "border-sky-300 bg-sky-100/70 text-sky-950 hover:bg-sky-100 border-l-[3px] border-l-sky-500",
                  !isPastSlot &&
                    !slot.isAvailable &&
                    !isBooked &&
                    "border-gray-300 bg-gray-100 text-gray-600"
                )}
                style={{ top, height }}
                disabled={isDisabled}
                onClick={() => {
                  if (interactionDisabled) return;
                  onSlotClick?.(slot, appointment);
                }}
              >
                <div className="flex items-center justify-between gap-1 font-semibold leading-none">
                  <span className="min-w-0 truncate whitespace-nowrap">
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </span>
                  {isBooked ? (
                    <User className="h-3 w-3 shrink-0" />
                  ) : (
                    <Clock className="h-3 w-3 shrink-0 opacity-70" />
                  )}
                </div>
                <div className="mt-0.5 truncate leading-none">
                  {isBooked && appointment
                    ? `${appointment.patient.cognome}`
                    : `${slot.durationMinutes} min`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
