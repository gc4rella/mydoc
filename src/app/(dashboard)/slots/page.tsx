import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { SlotList } from "@/components/slots/slot-list";
import { QuickSlotForm } from "@/components/slots/quick-slot-form";
import { getDoctorSlots } from "@/actions/slots";

export const dynamic = "force-dynamic";

async function SlotListLoader() {
  const slots = await getDoctorSlots();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <QuickSlotForm />
      </div>
      <SlotList slots={slots} />
    </div>
  );
}

export default async function SlotsPage() {
  return (
    <div>
      <Header title="Disponibilita" />
      <div className="p-6">
        <Suspense fallback={<div>Caricamento...</div>}>
          <SlotListLoader />
        </Suspense>
      </div>
    </div>
  );
}
