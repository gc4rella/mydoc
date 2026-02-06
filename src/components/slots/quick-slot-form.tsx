"use client";

import { useState } from "react";
import { createDoctorSlotsBlock } from "@/actions/slots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, ChevronDown, Sun, Sunset, Calendar } from "lucide-react";
import { formatDateLocal, parseLocalDate } from "@/lib/slot-utils";

const PRESETS = [
  { id: "mattina", label: "Mattina", icon: Sun, startHour: 9, startMin: 0, endHour: 13, endMin: 0 },
  { id: "pomeriggio", label: "Pomeriggio", icon: Sunset, startHour: 14, startMin: 0, endHour: 18, endMin: 0 },
  { id: "giornata", label: "Giornata", icon: Calendar, startHour: 9, startMin: 0, endHour: 18, endMin: 0 },
];

export function QuickSlotForm() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateLocal(tomorrow);
  });
  const [duration, setDuration] = useState("30");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customStart, setCustomStart] = useState("09:00");
  const [customEnd, setCustomEnd] = useState("13:00");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreset = async (preset: typeof PRESETS[0]) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("date", date);
    formData.set("startHour", preset.startHour.toString());
    formData.set("startMinute", preset.startMin.toString());
    formData.set("endHour", preset.endHour.toString());
    formData.set("endMinute", preset.endMin.toString());
    formData.set("slotDuration", duration);

    const result = await createDoctorSlotsBlock(undefined, formData);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      const skipped = result.skipped ? `, ${result.skipped} saltati` : "";
      setSuccess(`${result.count} slot creati (${preset.label})${skipped}`);
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 1500);
    }
    setLoading(false);
  };

  const handleCustom = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const [startH, startM] = customStart.split(":").map(Number);
    const [endH, endM] = customEnd.split(":").map(Number);

    const formData = new FormData();
    formData.set("date", date);
    formData.set("startHour", startH.toString());
    formData.set("startMinute", startM.toString());
    formData.set("endHour", endH.toString());
    formData.set("endMinute", endM.toString());
    formData.set("slotDuration", duration);

    const result = await createDoctorSlotsBlock(undefined, formData);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      const skipped = result.skipped ? `, ${result.skipped} saltati` : "";
      setSuccess(`${result.count} slot creati${skipped}`);
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 1500);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    // Use parseLocalDate to avoid timezone issues with YYYY-MM-DD strings
    const d = parseLocalDate(dateStr, 12, 0);
    return new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Disponibilita
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi Disponibilita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground capitalize">
              {formatDate(date)}
            </p>
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <Label>Durata appuntamenti</Label>
            <Select value={duration} onValueChange={setDuration} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minuti</SelectItem>
                <SelectItem value="20">20 minuti</SelectItem>
                <SelectItem value="30">30 minuti</SelectItem>
                <SelectItem value="45">45 minuti</SelectItem>
                <SelectItem value="60">60 minuti</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <Label>Fascia oraria</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  className="flex-col h-auto py-3"
                  onClick={() => handlePreset(preset)}
                  disabled={loading}
                >
                  <preset.icon className="h-5 w-5 mb-1" />
                  <span className="text-xs">{preset.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {preset.startHour}:00-{preset.endHour}:00
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full">
                Orario personalizzato
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Inizio</Label>
                  <Input
                    type="time"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fine</Label>
                  <Input
                    type="time"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleCustom}
                disabled={loading}
              >
                Crea con orario personalizzato
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Feedback */}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
