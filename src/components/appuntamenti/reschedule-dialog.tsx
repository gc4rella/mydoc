"use client";

import { type ReactNode } from "react";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { rescheduleAppointment } from "@/actions/appointments";
import { SlotSelectionDialog } from "@/components/appuntamenti/slot-selection-dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarCog } from "lucide-react";

interface RescheduleDialogProps {
  appointment: AppointmentWithDetails;
  trigger?: ReactNode;
}

export function RescheduleDialog({ appointment, trigger }: RescheduleDialogProps) {
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <SlotSelectionDialog
      title="Sposta Appuntamento"
      trigger={
        trigger || (
          <Button size="sm" variant="outline">
            <CalendarCog className="h-4 w-4 mr-1" />
            Modifica
          </Button>
        )
      }
      infoPanel={
        <div className="bg-muted p-3 rounded-lg">
          <div className="font-medium">
            {appointment.patient.cognome} {appointment.patient.nome}
          </div>
          <div className="text-sm text-muted-foreground">{appointment.request.motivo}</div>
          <div className="text-sm mt-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Attuale: {formatDateTime(appointment.slot.startTime)}</span>
          </div>
        </div>
      }
      emptyState="Nessun altro slot disponibile."
      successMessage="Appuntamento spostato!"
      maxSlots={15}
      onSelectSlot={(slot) => rescheduleAppointment(appointment.id, slot.id)}
    />
  );
}
