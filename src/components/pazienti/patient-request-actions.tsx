"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Request } from "@/db/schema";
import type { AppointmentWithDetails } from "@/actions/appointments";
import {
  cancelAppointment,
  scheduleRequestAtNextAvailable,
} from "@/actions/appointments";
import { rejectRequest, deleteRequest } from "@/actions/richieste";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScheduleDialog } from "@/components/appuntamenti/schedule-dialog";
import { RescheduleDialog } from "@/components/appuntamenti/reschedule-dialog";
import { MoreVertical, CalendarX, Trash2, X, Zap } from "lucide-react";
import { REQUEST_STATUS } from "@/lib/request-status";

interface PatientRequestActionsProps {
  request: Request;
  appointment?: AppointmentWithDetails;
}

export function PatientRequestActions({
  request,
  appointment,
}: PatientRequestActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCancelAppointment = async () => {
    if (!appointment) return;
    if (!confirm("Annullare l'appuntamento? Tornera in lista d'attesa.")) return;

    setLoading(true);
    await cancelAppointment(appointment.id);
    router.refresh();
    setLoading(false);
  };

  const handleRemoveFromList = async () => {
    if (!confirm("Rimuovere dalla lista d'attesa?")) return;

    setLoading(true);
    await rejectRequest(request.id);
    router.refresh();
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Eliminare definitivamente questa richiesta?")) return;

    setLoading(true);
    await deleteRequest(request.id);
    router.refresh();
    setLoading(false);
  };

  const handleScheduleNextAvailable = async () => {
    setLoading(true);
    const result = await scheduleRequestAtNextAvailable(request.id);
    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
    setLoading(false);
  };

  // For waiting requests: show schedule button + dropdown with remove/delete
  if (request.stato === REQUEST_STATUS.WAITING) {
    return (
      <div className="flex items-center gap-1">
        <ScheduleDialog
          request={{
            ...request,
            patient: { nome: "", cognome: "" },
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={handleScheduleNextAvailable}
          title="Assegna primo slot disponibile"
        >
          <Zap className="h-4 w-4 text-amber-600" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={loading}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleRemoveFromList}>
              <X className="h-4 w-4 mr-2" />
              Rimuovi dalla lista
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // For scheduled requests: show reschedule + cancel + delete
  if (request.stato === REQUEST_STATUS.SCHEDULED && appointment) {
    return (
      <div className="flex items-center gap-1">
        <RescheduleDialog appointment={appointment} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={loading}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCancelAppointment}>
              <CalendarX className="h-4 w-4 mr-2" />
              Annulla appuntamento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return null;
}
