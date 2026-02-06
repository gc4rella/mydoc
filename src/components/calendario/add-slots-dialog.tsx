"use client";

import { useState } from "react";
import { createDoctorSlotsBlock } from "@/actions/slots";
import { formatDateLocal } from "@/lib/slot-utils";
import { Button } from "@/components/ui/button";
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
}

export function AddSlotsDialog({ date, open, onOpenChange, onCreated }: AddSlotsDialogProps) {
  const [duration, setDuration] = useState("30");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

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

    const formData = new FormData();
    formData.set("date", formatDateLocal(date));
    formData.set("startHour", preset.startHour.toString());
    formData.set("startMinute", "0");
    formData.set("endHour", preset.endHour.toString());
    formData.set("endMinute", "0");
    formData.set("slotDuration", duration);

    const result = await createDoctorSlotsBlock(undefined, formData);

    if (result.error) {
      alert(result.error);
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

          {success && (
            <div className="text-center text-sm text-emerald-600 font-medium">
              {success}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
