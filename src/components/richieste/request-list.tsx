"use client";

import Link from "next/link";
import type { RequestWithPatient } from "@/actions/richieste";
import type { AppointmentWithDetails } from "@/actions/appointments";
import { deleteRequest, rejectRequest } from "@/actions/richieste";
import { cancelAppointment } from "@/actions/appointments";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UrgenzaBadge } from "./status-badge";
import { NoteEditor } from "./note-editor";
import { ScheduleDialog } from "@/components/appuntamenti/schedule-dialog";
import { Trash2, Calendar, X } from "lucide-react";

interface RequestListProps {
  requests: RequestWithPatient[];
  appointments?: AppointmentWithDetails[];
}

export function RequestList({ requests, appointments = [] }: RequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nessuna richiesta in lista d&#39;attesa
      </div>
    );
  }

  // Create a map of requestId -> appointment for quick lookup
  const appointmentMap = new Map<string, AppointmentWithDetails>();
  for (const apt of appointments) {
    appointmentMap.set(apt.requestId, apt);
  }

  const handleDelete = async (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questa richiesta?")) {
      await deleteRequest(id);
    }
  };

  const handleReject = async (id: string) => {
    if (confirm("Rimuovere dalla lista d'attesa?")) {
      await rejectRequest(id);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (confirm("Annullare l'appuntamento e rimettere in lista d'attesa?")) {
      await cancelAppointment(appointmentId);
    }
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Split by status
  const waitingRequests = requests.filter((r) => r.stato === "waiting");
  const scheduledRequests = requests.filter((r) => r.stato === "scheduled");

  return (
    <div className="space-y-6">
      {/* Waiting list */}
      {waitingRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            In attesa ({waitingRequests.length})
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paziente</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Urgenza</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Link
                        href={`/pazienti/${request.patient.id}`}
                        className="font-medium hover:underline"
                      >
                        {request.patient.cognome} {request.patient.nome}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate">{request.motivo}</div>
                      {request.note && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {request.note}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <UrgenzaBadge urgenza={request.urgenza as "bassa" | "media" | "alta"} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ScheduleDialog request={request} />
                        <NoteEditor
                          requestId={request.id}
                          currentNote={request.note}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(request.id)}
                          title="Rimuovi dalla lista"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Scheduled */}
      {scheduledRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Programmati ({scheduledRequests.length})
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paziente</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Appuntamento</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledRequests.map((request) => {
                  const appointment = appointmentMap.get(request.id);
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Link
                          href={`/pazienti/${request.patient.id}`}
                          className="font-medium hover:underline"
                        >
                          {request.patient.cognome} {request.patient.nome}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate">{request.motivo}</div>
                      </TableCell>
                      <TableCell>
                        {appointment ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span>{formatDateTime(appointment.slot.startTime)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {appointment && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelAppointment(appointment.id)}
                              title="Annulla appuntamento"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(request.id)}
                            title="Elimina richiesta"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
