import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/components/pazienti/patient-form";
import { ArrowLeft } from "lucide-react";

export default function NuovoPazientePage() {
  return (
    <div>
      <Header title="Nuovo Paziente">
        <Button variant="ghost" asChild>
          <Link href="/pazienti">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Link>
        </Button>
      </Header>
      <div className="p-6 max-w-2xl">
        <PatientForm />
      </div>
    </div>
  );
}
