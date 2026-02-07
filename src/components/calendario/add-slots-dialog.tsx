"use client";

import { useMemo, useState } from "react";
import { createDoctorSlot, createDoctorSlotsBlock } from "@/actions/slots";
import { formatDateLocal } from "@/lib/slot-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sun, Sunset, Clock } from "lucide-react";

const PRESETS = [
  { id: "mattina", label: "Mattina", icon: Sun, startHour: 9, endHour: 13 },
  { id: "pomeriggio", label: "Pomeriggio", icon: Sunset, startHour: 14, endHour: 18 },
];

interface AddSlotsDialogProps {
  date: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initialStartMinutes?: number;
  initialEndMinutes?: number;
}

function minutesToTimeValue(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
  const mm = String(clamped % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function timeValueToMinutes(value: string): number | null {
  const [hh, mm] = value.split(":").map(Number);
  if (
    Number.isNaN(hh) ||
    Number.isNaN(mm) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59
  ) {
    return null;
  }
  return hh * 60 + mm;
}

export function AddSlotsDialog({
  date,
  open,
  onOpenChange,
  onCreated,
  initialStartMinutes,
  initialEndMinutes,
}: AddSlotsDialogProps) {
  const [duration, setDuration] = useState("30");
  const [customStart, setCustomStart] = useState(() =>
    minutesToTimeValue(initialStartMinutes ?? 9 * 60)
  );
  const [customEnd, setCustomEnd] = useState(() =>
    minutesToTimeValue(initialEndMinutes ?? (initialStartMinutes ?? 9 * 60) + 30)
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customDuration = useMemo(() => {
    const startMinutes = timeValueToMinutes(customStart);
    const endMinutes = timeValueToMinutes(customEnd);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return null;
    }
    return endMinutes - startMinutes;
  }, [customStart, customEnd]);

  const formatDate = (d: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  };

  const handlePreset = async (preset: typeof PRESETS[0]) => {
    setLoading(true);
    setSuccess(null);
    setError(null);

    const formData = new FormData();
    formData.set("date", formatDateLocal(date));
    formData.set("startHour", preset.startHour.toString());
    formData.set("startMinute", "0");
    formData.set("endHour", preset.endHour.toString());
    formData.set("endMinute", "0");
    formData.set("slotDuration", duration);

    const result = await createDoctorSlotsBlock(undefined, formData);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      const skipped = result.skipped ? `, ${result.skipped} saltati` : "";
      setSuccess(`${result.count} slot creati${skipped}`);
      setTimeout(() => {
        onCreated();
        onOpenChange(false);
        setSuccess(null);
      }, 800);
    }
    setLoading(false);
  };

  const handleCreateCustomSlot = async () => {
    const startMinutes = timeValueToMinutes(customStart);
    const endMinutes = timeValueToMinutes(customEnd);

    if (startMinutes === null || endMinutes === null) {
      setError("Inserisci orari validi");
      return;
    }

    if (endMinutes <= startMinutes) {
      setError("L'orario di fine deve essere successivo all'inizio");
      return;
    }

    const startDate = new Date(date);
    startDate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

    setLoading(true);
    setSuccess(null);
    setError(null);

    const formData = new FormData();
    formData.set("startTime", startDate.toISOString());
    formData.set("endTime", endDate.toISOString());
    formData.set("durationMinutes", (endMinutes - startMinutes).toString());

    const result = await createDoctorSlot(undefined, formData);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccess("Slot personalizzato creato");
      setTimeout(() => {
        onCreated();
        onOpenChange(false);
        setSuccess(null);
      }, 800);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Aggiungi Slot</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-center font-medium capitalize text-muted-foreground">
            {formatDate(date)}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Durata
            </label>
            <Select value={duration} onValueChange={setDuration} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="20">20 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                className="flex-col h-auto py-4"
                onClick={() => handlePreset(preset)}
                disabled={loading}
              >
                <preset.icon className="h-6 w-6 mb-1" />
                <span className="font-medium">{preset.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {preset.startHour}:00 - {preset.endHour}:00
                </span>
              </Button>
            ))}
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="text-sm font-medium">Slot personalizzato</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Inizio</label>
                <Input
                  type="time"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Fine</label>
                <Input
                  type="time"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {customDuration ? `Durata: ${customDuration} min` : "Durata non valida"}
            </div>
            <Button
              onClick={handleCreateCustomSlot}
              disabled={loading || customDuration === null}
              className="w-full"
            >
              Crea Slot Personalizzato
            </Button>
          </div>

          {success && (
            <div className="text-center text-sm text-emerald-600 font-medium">
              {success}
            </div>
          )}
          {error && (
            <div className="text-center text-sm text-destructive font-medium">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
