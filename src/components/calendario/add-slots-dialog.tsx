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
  { id: "mattina", label: "Mattina", icon: Sun, startMinutes: 9 * 60, endMinutes: 13 * 60 },
  {
    id: "pomeriggio",
    label: "Pomeriggio",
    icon: Sunset,
    startMinutes: 14 * 60,
    endMinutes: 18 * 60,
  },
];

export type AddSlotsMode = "single" | "bulk" | "range";

interface AddSlotsDialogProps {
  date: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  mode?: AddSlotsMode;
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

function formatTimeLabel(minutes: number): string {
  return minutesToTimeValue(minutes);
}

export function AddSlotsDialog({
  date,
  open,
  onOpenChange,
  onCreated,
  mode = "bulk",
  initialStartMinutes,
  initialEndMinutes,
}: AddSlotsDialogProps) {
  const isBulkMode = mode === "bulk";
  const isRangeMode = mode === "range";
  const initialStart = initialStartMinutes ?? 9 * 60;
  const initialEnd = Math.max(
    initialEndMinutes ?? (isBulkMode ? 13 * 60 : initialStart + 30),
    initialStart + 30
  );
  const [duration, setDuration] = useState("30");
  const [customStart, setCustomStart] = useState(() => minutesToTimeValue(initialStart));
  const [customEnd, setCustomEnd] = useState(() => minutesToTimeValue(initialEnd));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rangeCreateMode, setRangeCreateMode] = useState<"bulk" | "single">("bulk");

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

  const selectedDuration = parseInt(duration, 10) || 30;
  const customStartMinutes = timeValueToMinutes(customStart);
  const customEndMinutes = timeValueToMinutes(customEnd);
  const estimatedRangeSlots =
    customDuration !== null && selectedDuration > 0
      ? Math.floor(customDuration / selectedDuration)
      : 0;
  const estimatedRangeRemainder =
    customDuration !== null && selectedDuration > 0
      ? customDuration % selectedDuration
      : 0;
  const intervalPreview =
    customStartMinutes !== null && customEndMinutes !== null && customEndMinutes > customStartMinutes
      ? `${formatTimeLabel(customStartMinutes)} - ${formatTimeLabel(customEndMinutes)} (${customEndMinutes - customStartMinutes} min)`
      : "Intervallo non valido";

  const handleBulkCreate = async (startMinutes: number, endMinutes: number) => {
    setLoading(true);
    setSuccess(null);
    setError(null);

    const formData = new FormData();
    const startHour = Math.floor(startMinutes / 60);
    const startMinute = startMinutes % 60;
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;

    formData.set("date", formatDateLocal(date));
    formData.set("startHour", startHour.toString());
    formData.set("startMinute", startMinute.toString());
    formData.set("endHour", endHour.toString());
    formData.set("endMinute", endMinute.toString());
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

  const handlePreset = async (preset: typeof PRESETS[0]) => {
    await handleBulkCreate(preset.startMinutes, preset.endMinutes);
  };

  const handleCreateCustomBlock = async () => {
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

    await handleBulkCreate(startMinutes, endMinutes);
  };

  const handleCreateSingleSlot = async () => {
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
      setSuccess("Slot creato");
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isRangeMode
              ? "Crea slot da selezione"
              : isBulkMode
                ? "Crea slot automatici"
                : "Crea slot singolo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-center font-medium capitalize text-muted-foreground">
            {formatDate(date)}
          </div>

          {isRangeMode ? (
            <>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-sm font-medium">Selezione da drag and drop</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {intervalPreview}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="text-sm font-medium">Intervallo</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Inizio</label>
                    <Input
                      type="time"
                      step={15 * 60}
                      value={customStart}
                      onChange={(event) => setCustomStart(event.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Fine</label>
                    <Input
                      type="time"
                      step={15 * 60}
                      value={customEnd}
                      onChange={(event) => setCustomEnd(event.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="text-sm font-medium">Tipo creazione</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={rangeCreateMode === "bulk" ? "default" : "outline"}
                    onClick={() => setRangeCreateMode("bulk")}
                    disabled={loading}
                  >
                    Slot multipli
                  </Button>
                  <Button
                    type="button"
                    variant={rangeCreateMode === "single" ? "default" : "outline"}
                    onClick={() => setRangeCreateMode("single")}
                    disabled={loading}
                  >
                    Slot unico
                  </Button>
                </div>

                {rangeCreateMode === "bulk" ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Durata singolo slot
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
                    <div className="text-xs text-muted-foreground">
                      {customDuration === null ? (
                        "Intervallo non valido"
                      ) : estimatedRangeSlots > 0 ? (
                        <>
                          Verranno creati {estimatedRangeSlots} slot da {selectedDuration} min
                          {estimatedRangeRemainder > 0
                            ? ` (${estimatedRangeRemainder} min finali non utilizzati)`
                            : ""}
                        </>
                      ) : (
                        "Intervallo troppo corto per la durata selezionata"
                      )}
                    </div>
                    <Button
                      onClick={handleCreateCustomBlock}
                      disabled={loading || customDuration === null || estimatedRangeSlots === 0}
                      className="w-full"
                    >
                      Crea {estimatedRangeSlots} slot
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      {customDuration
                        ? `Verrà creato 1 slot unico di ${customDuration} min.`
                        : "Intervallo non valido"}
                    </div>
                    <Button
                      onClick={handleCreateSingleSlot}
                      disabled={loading || customDuration === null}
                      className="w-full"
                    >
                      Crea 1 slot unico
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : isBulkMode ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Durata appuntamenti
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
                      {minutesToTimeValue(preset.startMinutes)} - {minutesToTimeValue(preset.endMinutes)}
                    </span>
                  </Button>
                ))}
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="text-sm font-medium">Intervallo personalizzato</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Inizio</label>
                    <Input
                      type="time"
                      step={15 * 60}
                      value={customStart}
                      onChange={(event) => setCustomStart(event.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Fine</label>
                    <Input
                      type="time"
                      step={15 * 60}
                      value={customEnd}
                      onChange={(event) => setCustomEnd(event.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {customDuration ? `Intervallo: ${customDuration} min` : "Intervallo non valido"}
                </div>
                <Button
                  onClick={handleCreateCustomBlock}
                  disabled={loading || customDuration === null}
                  className="w-full"
                >
                  Crea slot automatici
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="text-sm font-medium">Orario slot</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Inizio</label>
                  <Input
                    type="time"
                    step={15 * 60}
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Fine</label>
                  <Input
                    type="time"
                    step={15 * 60}
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {customDuration ? `Durata slot: ${customDuration} min` : "Durata non valida"}
              </div>
              <Button
                onClick={handleCreateSingleSlot}
                disabled={loading || customDuration === null}
                className="w-full"
              >
                Crea slot singolo
              </Button>
            </div>
          )}

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
