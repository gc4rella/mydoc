"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePatient } from "@/actions/pazienti";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeletePatientButtonProps {
  patientId: string;
}

export function DeletePatientButton({ patientId }: DeletePatientButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm("Eliminare definitivamente questo paziente?")) return;
    setLoading(true);
    setError(null);

    const result = await deletePatient(patientId);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/pazienti");
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="destructive" type="button" onClick={handleDelete} disabled={loading}>
        <Trash2 className="h-4 w-4 mr-2" />
        Elimina
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
