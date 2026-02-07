"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function WaitingSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const [query, setQuery] = useState(queryParam);

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query === queryParam) return;

      const params = new URLSearchParams(searchParams);
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      const queryString = params.toString();
      router.replace(queryString ? `/lista-attesa?${queryString}` : "/lista-attesa");
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, queryParam, router, searchParams]);

  const clearSearch = () => {
    setQuery("");
  };

  return (
    <div className="relative w-[260px]">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Cerca paziente o motivo..."
        className="pl-9 pr-9"
      />
      {query && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          onClick={clearSearch}
          aria-label="Cancella ricerca"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
