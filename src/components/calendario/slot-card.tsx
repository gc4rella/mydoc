"use client";

import type { DoctorSlot } from "@/db/schema";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { cn } from "@/lib/utils";
import { Clock, User } from "lucide-react";

interface SlotCardProps {
  slot: DoctorSlot;
  appointment?: AppointmentWithDetails;
  onClick?: () => void;
  isPast?: boolean;
}

export function SlotCard({ slot, appointment, onClick, isPast }: SlotCardProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const isBooked = !slot.isAvailable && appointment;

  const getStatusStyles = () => {
    if (isPast) {
      return {
        container: "bg-gray-50 border-gray-200 text-gray-400 cursor-default",
        icon: null,
      };
    }

    if (isBooked) {
      return {
        container: "bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100",
        icon: <User className="h-3 w-3 text-emerald-500" />,
      };
    }

    if (slot.isAvailable) {
      return {
        container: "bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100 hover:border-sky-300",
        icon: <Clock className="h-3 w-3 text-sky-400" />,
      };
    }

    // Slot marked unavailable but no appointment (shouldn't happen normally)
    return {
      container: "bg-gray-100 border-gray-200 text-gray-600",
      icon: null,
    };
  };

  const styles = getStatusStyles();

  return (
    <div
      className={cn(
        "px-2 py-1.5 rounded-md border text-xs transition-all",
        !isPast && "cursor-pointer",
        styles.container
      )}
      onClick={isPast ? undefined : onClick}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-semibold">
          {formatTime(slot.startTime)}
        </span>
        {styles.icon}
      </div>

      {isBooked ? (
        <div className="flex items-center gap-1 mt-0.5">
          <span className="truncate font-medium">
            {appointment.patient.cognome}
          </span>
        </div>
      ) : slot.isAvailable && !isPast ? (
        <div className="text-[10px] opacity-60 mt-0.5">
          {slot.durationMinutes} min
        </div>
      ) : null}
    </div>
  );
}
