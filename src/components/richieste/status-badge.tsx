import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { REQUEST_STATUS, type RequestStatus } from "@/lib/request-status";

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  [REQUEST_STATUS.WAITING]: {
    label: "In Attesa",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  [REQUEST_STATUS.SCHEDULED]: {
    label: "Prenotato",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  [REQUEST_STATUS.REJECTED]: {
    label: "Rimosso",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
};

interface StatusBadgeProps {
  stato: RequestStatus;
}

export function StatusBadge({ stato }: StatusBadgeProps) {
  const config = statusConfig[stato];
  return (
    <Badge variant="secondary" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}

type Urgenza = "bassa" | "media" | "alta";

const urgenzaConfig: Record<Urgenza, { label: string; className: string }> = {
  bassa: {
    label: "Bassa",
    className: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  },
  media: {
    label: "Media",
    className: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  },
  alta: {
    label: "Alta",
    className: "bg-red-500 text-white hover:bg-red-500 font-semibold",
  },
};

interface UrgenzaBadgeProps {
  urgenza: Urgenza;
}

export function UrgenzaBadge({ urgenza }: UrgenzaBadgeProps) {
  const config = urgenzaConfig[urgenza];
  return (
    <Badge variant="secondary" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
