"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isRequestStatus, REQUEST_STATUS } from "@/lib/request-status";

const statusOptions = [
  { value: "all", label: "Tutti" },
  { value: REQUEST_STATUS.WAITING, label: "In Attesa" },
  { value: REQUEST_STATUS.SCHEDULED, label: "Prenotati" },
  { value: REQUEST_STATUS.REJECTED, label: "Rimossi" },
];

export function StatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawStatus = searchParams.get("stato");
  const currentStatus = rawStatus && isRequestStatus(rawStatus) ? rawStatus : "all";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete("stato");
    } else {
      params.set("stato", value);
    }
    router.replace(`/lista-attesa?${params.toString()}`);
  };

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Filtra" />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
