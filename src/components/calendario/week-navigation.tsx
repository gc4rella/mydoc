"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeekNavigationProps {
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

export function WeekNavigation({
  weekStart,
  onPrevWeek,
  onNextWeek,
  onToday,
}: WeekNavigationProps) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      day: "numeric",
      month: "short",
    }).format(date);
  };

  const formatYear = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onPrevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="outline" size="sm" onClick={onToday}>
        Oggi
      </Button>
      <span className="text-lg font-semibold">
        {formatDate(weekStart)} - {formatDate(weekEnd)} {formatYear(weekStart)}
      </span>
    </div>
  );
}
