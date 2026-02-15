"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Request } from "@/db/schema";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { cancelAppointment } from "@/actions/appointments";
import { rejectRequest, deleteRequest } from "@/actions/richieste";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScheduleDialog } from "@/components/appuntamenti/schedule-dialog";
import { RescheduleDialog } from "@/components/appuntamenti/reschedule-dialog";
import { AutoAssignDialog } from "@/components/richieste/auto-assign-dialog";
import { MoreVertical, CalendarX, Trash2, X } from "lucide-react";
import { REQUEST_STATUS } from "@/lib/request-status";

interface PatientRequestActionsProps {
  request: Request;
  appointment?: AppointmentWithDetails;
}

type PatientConfirmAction = "cancel-appointment" | "remove-from-list" | "delete-request" | null;

export function PatientRequestActions({
  request,
  appointment,
}: PatientRequestActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<PatientConfirmAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCancelAppointment = async () => {
    if (!appointment) return;

    setLoading(true);
    setActionError(null);
    const result = await cancelAppointment(appointment.id);
    if (result.error) {
      setLoading(false);
      setActionError(result.error);
      return result;
    }

    router.refresh();
    setLoading(false);
    return { success: true };
  };

  const handleRemoveFromList = async () => {
    setLoading(true);
    setActionError(null);
    await rejectRequest(request.id);
    router.refresh();
    setLoading(false);
    return { success: true };
  };

  const handleDelete = async () => {
    setLoading(true);
    setActionError(null);
    await deleteRequest(request.id);
    router.refresh();
    setLoading(false);
    return { success: true };
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    if (confirmAction === "cancel-appointment") {
      return handleCancelAppointment();
    }
    if (confirmAction === "remove-from-list") {
      return handleRemoveFromList();
    }
    return handleDelete();
  };

  const confirmTitle = (() => {
    if (!confirmAction) return "";
    if (confirmAction === "cancel-appointment") {
      return "Annullare appuntamento?";
    }
    if (confirmAction === "remove-from-list") {
      return "Rimuovere dalla lista d'attesa?";
    }
    return "Eliminare richiesta?";
  })();

  const confirmDescription = (() => {
    if (!confirmAction) return undefined;
    if (confirmAction === "cancel-appointment") {
      return "Il paziente tornerà in lista d'attesa.";
    }
    if (confirmAction === "remove-from-list") {
      return "La richiesta verrà spostata in archivio.";
    }
    return "La richiesta verrà eliminata definitivamente.";
  })();

  const confirmLabel = (() => {
    if (!confirmAction) return "Conferma";
    if (confirmAction === "cancel-appointment") {
      return "Annulla appuntamento";
    }
    if (confirmAction === "remove-from-list") {
      return "Rimuovi";
    }
    return "Elimina richiesta";
  })();

  const confirmVariant =
    confirmAction === "remove-from-list" ? ("default" as const) : ("destructive" as const);

  // For waiting requests: show schedule button + dropdown with remove/delete
  if (request.stato === REQUEST_STATUS.WAITING) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <ScheduleDialog
            request={{
              ...request,
              patient: { nome: "", cognome: "" },
            }}
          />
          <AutoAssignDialog
            requestId={request.id}
            motivo={request.motivo}
            disabled={loading}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={loading}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setConfirmAction("remove-from-list")}>
                <X className="h-4 w-4 mr-2" />
                Rimuovi dalla lista
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmAction("delete-request")}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {actionError && <p className="text-sm text-destructive">{actionError}</p>}

        <ConfirmationDialog
          open={Boolean(confirmAction)}
          onOpenChange={(open) => {
            if (!open) setConfirmAction(null);
          }}
          title={confirmTitle}
          description={confirmDescription}
          confirmLabel={confirmLabel}
          confirmVariant={confirmVariant}
          loadingLabel="Operazione in corso..."
          onConfirm={handleConfirmAction}
        />
      </div>
    );
  }

  // For scheduled requests: show reschedule + cancel + delete
  if (request.stato === REQUEST_STATUS.SCHEDULED && appointment) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <RescheduleDialog appointment={appointment} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={loading}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setConfirmAction("cancel-appointment")}>
                <CalendarX className="h-4 w-4 mr-2" />
                Annulla appuntamento
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmAction("delete-request")}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {actionError && <p className="text-sm text-destructive">{actionError}</p>}

        <ConfirmationDialog
          open={Boolean(confirmAction)}
          onOpenChange={(open) => {
            if (!open) setConfirmAction(null);
          }}
          title={confirmTitle}
          description={confirmDescription}
          confirmLabel={confirmLabel}
          confirmVariant={confirmVariant}
          loadingLabel="Operazione in corso..."
          onConfirm={handleConfirmAction}
        />
      </div>
    );
  }

  return null;
}
