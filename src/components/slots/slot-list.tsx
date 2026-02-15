"use client";

import { useState } from "react";
import type { DoctorSlot } from "@/db/schema";
import { deleteDoctorSlot } from "@/actions/slots";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { SlotBadge } from "./slot-badge";
import { Trash2 } from "lucide-react";

interface SlotListProps {
  slots: DoctorSlot[];
}

export function SlotList({ slots }: SlotListProps) {
  const [slotToDelete, setSlotToDelete] = useState<DoctorSlot | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (slots.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nessuno slot trovato
      </div>
    );
  }

  const handleDelete = async () => {
    if (!slotToDelete) return;

    setError(null);
    const result = await deleteDoctorSlot(slotToDelete.id);
    if (result.error) {
      setError(result.error);
      return result;
    }

    return { success: true };
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

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e Ora</TableHead>
              <TableHead>Fine</TableHead>
              <TableHead>Durata</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="w-[80px]">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slots.map((slot) => (
              <TableRow key={slot.id}>
                <TableCell className="font-medium">
                  {formatDateTime(slot.startTime)}
                </TableCell>
                <TableCell>{formatTime(slot.endTime)}</TableCell>
                <TableCell>{slot.durationMinutes} min</TableCell>
                <TableCell>
                  <SlotBadge isAvailable={slot.isAvailable} />
                </TableCell>
                <TableCell className="max-w-[150px] truncate">
                  {slot.note || "-"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSlotToDelete(slot)}
                    disabled={!slot.isAvailable}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ConfirmationDialog
        open={Boolean(slotToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setSlotToDelete(null);
          }
        }}
        title="Eliminare slot?"
        description={
          slotToDelete
            ? `Lo slot del ${formatDateTime(slotToDelete.startTime)} verrà eliminato.`
            : undefined
        }
        confirmLabel="Elimina slot"
        confirmVariant="destructive"
        loadingLabel="Eliminazione..."
        onConfirm={handleDelete}
      />
    </div>
  );
}
