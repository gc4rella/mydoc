import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FileText,
  Clock,
  AlertCircle,
  CalendarDays,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react";
import { getPatients } from "@/actions/pazienti";
import { getRequests } from "@/actions/richieste";
import { getDoctorSlots } from "@/actions/slots";
import { REQUEST_STATUS } from "@/lib/request-status";

export const dynamic = "force-dynamic";

interface MetricCardProps {
  title: string;
  value: number;
  href: string;
  icon: LucideIcon;
  subtitle?: string;
}

function MetricCard({ title, value, href, icon: Icon, subtitle }: MetricCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  const now = new Date();
  const [patients, requests, upcomingSlots] = await Promise.all([
    getPatients(),
    getRequests(),
    getDoctorSlots({ startDate: now }),
  ]);

  const waitingCount = requests.filter(
    (r) => r.stato === REQUEST_STATUS.WAITING
  ).length;
  const urgentCount = requests.filter((r) => r.urgenza === "alta").length;
  const totalUpcomingSlots = upcomingSlots.length;
  const freeUpcomingSlots = upcomingSlots.filter((slot) => slot.isAvailable).length;
  const bookedUpcomingSlots = totalUpcomingSlots - freeUpcomingSlots;

  const metrics: MetricCardProps[] = [
    {
      title: "Totale Pazienti",
      value: patients.length,
      href: "/pazienti",
      icon: Users,
    },
    {
      title: "Richieste Totali",
      value: requests.length,
      href: "/lista-attesa",
      icon: FileText,
    },
    {
      title: "In Attesa",
      value: waitingCount,
      href: `/lista-attesa?stato=${REQUEST_STATUS.WAITING}`,
      icon: Clock,
    },
    {
      title: "Urgenti",
      value: urgentCount,
      href: "/lista-attesa?urgenza=alta",
      icon: AlertCircle,
    },
    {
      title: "Slot Disponibili",
      value: totalUpcomingSlots,
      href: "/agenda",
      icon: CalendarDays,
      subtitle: "Totale slot futuri in agenda",
    },
    {
      title: "Slot Liberi",
      value: freeUpcomingSlots,
      href: "/agenda",
      icon: CalendarCheck,
      subtitle: `${bookedUpcomingSlots} occupati`,
    },
  ];

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>
      </div>
    </div>
  );
}
