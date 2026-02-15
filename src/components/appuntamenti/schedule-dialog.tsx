"use client";

import { scheduleRequest } from "@/actions/appointments";
import { SlotSelectionDialog } from "@/components/appuntamenti/slot-selection-dialog";
import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";

interface ScheduleDialogProps {
  request: {
    id: string;
    motivo: string;
    patient: {
      nome: string;
      cognome: string;
    };
  };
}

export function ScheduleDialog({ request }: ScheduleDialogProps) {
  const patientName = `${request.patient.cognome} ${request.patient.nome}`.trim();

  return (
    <SlotSelectionDialog
      title="Prenota Appuntamento"
      trigger={
        <Button size="sm" variant="outline">
          <CalendarCheck className="h-4 w-4 mr-1" />
          Prenota
        </Button>
      }
      infoPanel={
        <div className="bg-muted p-3 rounded-lg">
          {patientName && <div className="font-medium">{patientName}</div>}
          <div className={patientName ? "text-sm text-muted-foreground" : "font-medium"}>
            {request.motivo}
          </div>
        </div>
      }
      emptyState={
        <>
          Nessuno slot disponibile.
          <br />
          <span className="text-sm">Aggiungi disponibilita dal calendario.</span>
        </>
      }
      successMessage="Appuntamento prenotato!"
      confirmSelectionTitle="Confermare prenotazione?"
      confirmSelectionDescription="Controlla lo slot selezionato e conferma la prenotazione."
      confirmSelectionLabel="Prenota slot"
      onSelectSlot={(slot) => scheduleRequest(request.id, slot.id)}
    />
  );
}
