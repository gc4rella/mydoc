import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { CalendarView } from "@/components/calendario/calendar-view";

export const dynamic = "force-dynamic";

function CalendarLoading() {
  return (
    <div className="h-[500px] flex items-center justify-center text-muted-foreground">
      Caricamento...
    </div>
  );
}

export default function AgendaPage() {
  return (
    <div>
      <Header title="Agenda e Disponibilita" />
      <div className="p-6">
        <Suspense fallback={<CalendarLoading />}>
          <CalendarView />
        </Suspense>
      </div>
    </div>
  );
}
