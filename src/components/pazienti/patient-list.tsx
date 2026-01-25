import Link from "next/link";
import type { Patient } from "@/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface PatientListProps {
  patients: Patient[];
}

export function PatientList({ patients }: PatientListProps) {
  if (patients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nessun paziente trovato
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cognome</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Telefono</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="w-[80px]">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell className="font-medium">{patient.cognome}</TableCell>
              <TableCell>{patient.nome}</TableCell>
              <TableCell>{patient.telefono}</TableCell>
              <TableCell>{patient.email || "-"}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/pazienti/${patient.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
