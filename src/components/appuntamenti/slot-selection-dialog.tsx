"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { DoctorSlot } from "@/db/schema";
import { getDoctorSlots } from "@/actions/slots";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, Clock } from "lucide-react";

interface SlotSelectionDialogProps {
  title: string;
  trigger: ReactNode;
  infoPanel: ReactNode;
  emptyState: ReactNode;
  successMessage: string;
  maxSlots?: number;
  onSelectSlot: (slot: DoctorSlot) => Promise<{ error?: string } | void>;
}

export function SlotSelectionDialog({
  title,
  trigger,
  infoPanel,
  emptyState,
  successMessage,
  maxSlots = 10,
  onSelectSlot,
}: SlotSelectionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<DoctorSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingSlotId, setSubmittingSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadSlots = async () => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const slots = await getDoctorSlots({ onlyAvailable: true });
      const now = new Date();
      const futureSlots = slots.filter((s) => s.startTime > now).slice(0, maxSlots);
      setAvailableSlots(futureSlots);
      setLoading(false);
    };

    loadSlots();
  }, [maxSlots, open]);

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

  const handleSelect = async (slot: DoctorSlot) => {
    setSubmittingSlotId(slot.id);
    setError(null);

    const result = await onSelectSlot(slot);
    if (result?.error) {
      setError(result.error);
      setSubmittingSlotId(null);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
      setSubmittingSlotId(null);
      router.refresh();
    }, 1000);
  };

  const slotsByDate = availableSlots.reduce(
    (acc, slot) => {
      const dateKey = slot.startTime.toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    },
    {} as Record<string, DoctorSlot[]>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {infoPanel}

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Caricamento...</div>
          ) : availableSlots.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">{emptyState}</div>
          ) : success ? (
            <div className="py-8 text-center text-green-600">{successMessage}</div>
          ) : (
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
                        onClick={() => handleSelect(slot)}
                        disabled={submittingSlotId !== null}
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
                        {submittingSlotId === slot.id && <span className="text-xs">...</span>}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
