import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { RequestList } from "@/components/richieste/request-list";
import { RequestForm } from "@/components/richieste/request-form";
import { StatusFilter } from "@/components/richieste/status-filter";
import { getRequests } from "@/actions/richieste";
import { getPatients } from "@/actions/pazienti";
import { getAppointments } from "@/actions/appointments";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ stato?: string }>;
}

async function RequestListLoader({ stato }: { stato?: string }) {
  const [requests, patients, appointments] = await Promise.all([
    getRequests(stato),
    getPatients(),
    getAppointments(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RequestForm patients={patients} />
      </div>
      <RequestList requests={requests} appointments={appointments} />
    </div>
  );
}

export default async function RichiestePage({ searchParams }: PageProps) {
  const { stato } = await searchParams;

  return (
    <div>
      <Header title="Lista d'Attesa">
        <StatusFilter />
      </Header>
      <div className="p-6">
        <Suspense fallback={<div>Caricamento...</div>}>
          <RequestListLoader stato={stato} />
        </Suspense>
      </div>
    </div>
  );
}
