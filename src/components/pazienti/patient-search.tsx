"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function PatientSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") || "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the search
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (newValue.trim()) {
        params.set("q", newValue.trim());
      } else {
        params.delete("q");
      }
      router.replace(`/pazienti?${params.toString()}`);
    }, 300);
  }, [router, searchParams]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Cerca paziente..."
        className="pl-9 w-64"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}
