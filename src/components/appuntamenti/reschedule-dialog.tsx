"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DoctorSlot } from "@/db/schema";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { getDoctorSlots } from "@/actions/slots";
import { cancelAppointment, scheduleRequest } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarCog, Clock, Calendar } from "lucide-react";

interface RescheduleDialogProps {
  appointment: AppointmentWithDetails;
  trigger?: React.ReactNode;
}

export function RescheduleDialog({ appointment, trigger }: RescheduleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<DoctorSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      const loadSlots = async () => {
        setLoading(true);
        const slots = await getDoctorSlots({ onlyAvailable: true });
        const now = new Date();
        const futureSlots = slots
          .filter((s) => s.startTime > now)
          .slice(0, 15);
        setAvailableSlots(futureSlots);
        setLoading(false);
      };
      loadSlots();
    }
  }, [open]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

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

  const handleReschedule = async (newSlot: DoctorSlot) => {
    setScheduling(newSlot.id);
    setError(null);

    // Cancel current appointment (frees slot, moves request back to waiting)
    const cancelResult = await cancelAppointment(appointment.id);
    if (cancelResult.error) {
      setError(cancelResult.error);
      setScheduling(null);
      return;
    }

    // Schedule on new slot
    const scheduleResult = await scheduleRequest(appointment.requestId, newSlot.id);
    if (scheduleResult.error) {
      setError(scheduleResult.error);
      setScheduling(null);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
      setScheduling(null);
      router.refresh();
    }, 1000);
  };

  // Group slots by date
  const slotsByDate = availableSlots.reduce((acc, slot) => {
    const dateKey = slot.startTime.toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, DoctorSlot[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <CalendarCog className="h-4 w-4 mr-1" />
            Modifica
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sposta Appuntamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Current appointment info */}
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

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Caricamento...
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nessun altro slot disponibile.
            </div>
          ) : success ? (
            <div className="py-8 text-center text-green-600">
              Appuntamento spostato!
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Seleziona nuovo orario:</p>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {Object.entries(slotsByDate).map(([dateKey, slots]) => (
                  <div key={dateKey}>
                    <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(slots[0].startTime)}
                    </div>
                    <div className="grid gap-2">
                      {slots.map((slot) => (
                        <Button
                          key={slot.id}
                          variant="outline"
                          className="justify-between h-auto py-2"
                          onClick={() => handleReschedule(slot)}
                          disabled={scheduling !== null}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {slot.durationMinutes} min
                          </span>
                          {scheduling === slot.id && (
                            <span className="text-xs">...</span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
