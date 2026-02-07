import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { RequestList } from "@/components/richieste/request-list";
import { RequestForm } from "@/components/richieste/request-form";
import { StatusFilter } from "@/components/richieste/status-filter";
import { WaitingSearch } from "@/components/richieste/waiting-search";
import { getRequests } from "@/actions/richieste";
import { getPatients } from "@/actions/pazienti";
import { getAppointments } from "@/actions/appointments";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ stato?: string; q?: string }>;
}

async function RequestListLoader({ stato, q }: { stato?: string; q?: string }) {
  const [requests, patients, appointments] = await Promise.all([
    getRequests(stato, q),
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
  const { stato, q } = await searchParams;

  return (
    <div>
      <Header title="Lista d'Attesa">
        <WaitingSearch />
        <StatusFilter />
      </Header>
      <div className="p-6">
        <Suspense fallback={<div>Caricamento...</div>}>
          <RequestListLoader stato={stato} q={q} />
        </Suspense>
      </div>
    </div>
  );
}
