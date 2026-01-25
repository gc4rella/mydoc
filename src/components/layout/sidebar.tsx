"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Users, FileText, Home, LogOut, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Pazienti", href: "/pazienti", icon: Users },
  { name: "Lista d'Attesa", href: "/lista-attesa", icon: FileText },
  { name: "Agenda", href: "/agenda", icon: Calendar },
  { name: "Disponibilita", href: "/slots", icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-semibold">MyDoc</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <form action={logout}>
          <Button variant="ghost" className="w-full justify-start gap-3" type="submit">
            <LogOut className="h-4 w-4" />
            Esci
          </Button>
        </form>
      </div>
    </div>
  );
}
