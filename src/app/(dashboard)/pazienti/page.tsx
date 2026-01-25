import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { PatientList } from "@/components/pazienti/patient-list";
import { PatientSearch } from "@/components/pazienti/patient-search";
import { getPatients } from "@/actions/pazienti";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

async function PatientListLoader({ search }: { search?: string }) {
  const patients = await getPatients(search);
  return <PatientList patients={patients} />;
}

export default async function PazientiPage({ searchParams }: PageProps) {
  const { q } = await searchParams;

  return (
    <div>
      <Header title="Pazienti">
        <PatientSearch />
        <Button asChild>
          <Link href="/pazienti/nuovo">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Paziente
          </Link>
        </Button>
      </Header>
      <div className="p-6">
        <Suspense fallback={<div>Caricamento...</div>}>
          <PatientListLoader search={q} />
        </Suspense>
      </div>
    </div>
  );
}
