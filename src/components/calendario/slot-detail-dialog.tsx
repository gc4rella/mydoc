"use client";

import { useState } from "react";
import type { DoctorSlot } from "@/db/schema";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { deleteDoctorSlot } from "@/actions/slots";
import { cancelAppointment } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, User, Calendar, Trash2, X, CalendarCog } from "lucide-react";
import { RescheduleDialog } from "@/components/appuntamenti/reschedule-dialog";

interface SlotDetailDialogProps {
  slot: DoctorSlot | null;
  appointment?: AppointmentWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function SlotDetailDialog({
  slot,
  appointment,
  open,
  onOpenChange,
  onUpdate,
}: SlotDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"delete-slot" | "cancel-appointment" | null>(
    null
  );

  if (!slot) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleDelete = async () => {
    setLoading(true);
    setActionError(null);
    const result = await deleteDoctorSlot(slot.id);
    if (result.error) {
      setActionError(result.error);
      setLoading(false);
      return result;
    }

    onUpdate();
    onOpenChange(false);
    setLoading(false);
    return { success: true };
  };

  const handleCancel = async () => {
    if (!appointment) return;
    setLoading(true);
    setActionError(null);
    const result = await cancelAppointment(appointment.id);
    if (result.error) {
      setActionError(result.error);
      setLoading(false);
      return result;
    }

    onUpdate();
    onOpenChange(false);
    setLoading(false);
    return { success: true };
  };

  const isBooked = !slot.isAvailable && appointment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className={`h-5 w-5 ${isBooked ? "text-green-500" : "text-sky-500"}`} />
            {isBooked ? "Prenotato" : "Disponibile"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3 text-sm">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <div className="font-medium capitalize">{formatDate(slot.startTime)}</div>
              <div className="text-muted-foreground">
                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                <span className="ml-2">({slot.durationMinutes} min)</span>
              </div>
            </div>
          </div>

          {/* Patient Info (if booked) */}
          {isBooked && (
            <div className="flex items-start gap-3 text-sm">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {appointment.patient.cognome} {appointment.patient.nome}
                </div>
                <div className="text-muted-foreground">{appointment.request.motivo}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {slot.isAvailable ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmAction("delete-slot")}
                disabled={loading}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Elimina Slot
              </Button>
            ) : isBooked && appointment ? (
              <>
                <RescheduleDialog
                  appointment={appointment}
                  trigger={
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarCog className="h-4 w-4 mr-1" />
                      Sposta
                    </Button>
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmAction("cancel-appointment")}
                  disabled={loading}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Annulla
                </Button>
              </>
            ) : null}
          </div>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
        </div>
      </DialogContent>

      <ConfirmationDialog
        open={confirmAction === "delete-slot"}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title="Eliminare slot?"
        description="Lo slot verrà eliminato definitivamente."
        confirmLabel="Elimina slot"
        confirmVariant="destructive"
        loadingLabel="Eliminazione..."
        onConfirm={handleDelete}
      />

      <ConfirmationDialog
        open={confirmAction === "cancel-appointment"}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title="Annullare appuntamento?"
        description="Il paziente tornerà in lista d'attesa."
        confirmLabel="Annulla appuntamento"
        confirmVariant="destructive"
        loadingLabel="Annullamento..."
        onConfirm={handleCancel}
      />
    </Dialog>
  );
}
