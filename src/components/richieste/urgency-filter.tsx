"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const urgencyOptions = [
  { value: "all", label: "Tutte urgenze" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "bassa", label: "Bassa" },
] as const;

function isUrgencyValue(value: string | null): value is "alta" | "media" | "bassa" {
  return value === "alta" || value === "media" || value === "bassa";
}

export function UrgencyFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawUrgency = searchParams.get("urgenza");
  const currentUrgency = isUrgencyValue(rawUrgency) ? rawUrgency : "all";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete("urgenza");
    } else {
      params.set("urgenza", value);
    }
    const queryString = params.toString();
    router.replace(queryString ? `/lista-attesa?${queryString}` : "/lista-attesa");
  };

  return (
    <Select value={currentUrgency} onValueChange={handleChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Urgenza" />
      </SelectTrigger>
      <SelectContent>
        {urgencyOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
