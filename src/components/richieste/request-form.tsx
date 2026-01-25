"use client";

import { useActionState } from "react";
import { createRequest } from "@/actions/richieste";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus } from "lucide-react";
import type { Patient } from "@/db/schema";

interface RequestFormProps {
  patients: Patient[];
  preselectedPatientId?: string;
}

export function RequestForm({ patients, preselectedPatientId }: RequestFormProps) {
  const [state, formAction, isPending] = useActionState(createRequest, undefined);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuova Richiesta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova Richiesta</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patientId">Paziente *</Label>
            <Select name="patientId" defaultValue={preselectedPatientId} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un paziente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.cognome} {patient.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Textarea
              id="motivo"
              name="motivo"
              required
              disabled={isPending}
              rows={3}
              placeholder="Descrivi il motivo della richiesta..."
            />
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="urgenza">Urgenza *</Label>
              <Select name="urgenza" defaultValue="bassa" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bassa">Bassa</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desiredDate">Data Desiderata</Label>
              <Input
                id="desiredDate"
                name="desiredDate"
                type="date"
                disabled={isPending}
              />
            </div>
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-sm text-green-600">Richiesta creata con successo!</p>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creazione..." : "Crea Richiesta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
