"use client";

import { useActionState } from "react";
import type { Patient } from "@/db/schema";
import { createPatient, updatePatient } from "@/actions/pazienti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface PatientFormProps {
  patient?: Patient;
}

export function PatientForm({ patient }: PatientFormProps) {
  const isEditing = !!patient;

  const action = isEditing
    ? updatePatient.bind(null, patient.id)
    : createPatient;

  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                name="nome"
                defaultValue={patient?.nome}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cognome">Cognome *</Label>
              <Input
                id="cognome"
                name="cognome"
                defaultValue={patient?.cognome}
                required
                disabled={isPending}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telefono">Telefono *</Label>
              <Input
                id="telefono"
                name="telefono"
                type="tel"
                defaultValue={patient?.telefono}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={patient?.email || ""}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              name="note"
              defaultValue={patient?.note || ""}
              disabled={isPending}
              rows={3}
            />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Salvataggio..."
                : isEditing
                  ? "Salva Modifiche"
                  : "Crea Paziente"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
