import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SlotBadgeProps {
  isAvailable: boolean;
}

const statusConfig = {
  available: {
    label: "Disponibile",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  unavailable: {
    label: "Occupato",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

export function SlotBadge({ isAvailable }: SlotBadgeProps) {
  const config = isAvailable ? statusConfig.available : statusConfig.unavailable;

  return (
    <Badge variant="secondary" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
