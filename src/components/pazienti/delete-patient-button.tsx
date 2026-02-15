"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePatient } from "@/actions/pazienti";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Trash2 } from "lucide-react";

interface DeletePatientButtonProps {
  patientId: string;
}

export function DeletePatientButton({ patientId }: DeletePatientButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    const result = await deletePatient(patientId);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return result;
    }

    router.push("/pazienti");
    return { success: true };
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="destructive"
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Elimina
      </Button>
      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminare paziente?"
        description="Questa operazione elimina definitivamente il paziente."
        confirmLabel="Elimina paziente"
        confirmVariant="destructive"
        loadingLabel="Eliminazione..."
        onConfirm={handleDelete}
      />
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
