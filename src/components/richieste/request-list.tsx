"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { UrgenzaBadge } from "./status-badge";
import { NoteEditor } from "./note-editor";
import { ScheduleDialog } from "@/components/appuntamenti/schedule-dialog";
import { AutoAssignDialog } from "@/components/richieste/auto-assign-dialog";
import { Trash2, Calendar, X } from "lucide-react";
import { REQUEST_STATUS } from "@/lib/request-status";
import { formatDateTime } from "@/lib/datetime";

interface RequestListProps {
  requests: RequestWithPatient[];
  appointments?: AppointmentWithDetails[];
}

type RequestListConfirmAction =
  | { type: "delete-request"; requestId: string }
  | { type: "reject-request"; requestId: string }
  | { type: "cancel-appointment"; appointmentId: string }
  | null;

export function RequestList({ requests, appointments = [] }: RequestListProps) {
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<RequestListConfirmAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    setActionError(null);
    await deleteRequest(id);
    router.refresh();
    return { success: true };
  };

  const handleReject = async (id: string) => {
    setActionError(null);
    await rejectRequest(id);
    router.refresh();
    return { success: true };
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    setActionError(null);
    const result = await cancelAppointment(appointmentId);
    if (result.error) {
      setActionError(result.error);
      return result;
    }

    router.refresh();
    return { success: true };
  };

  // Split by status
  const waitingRequests = requests.filter(
    (r) => r.stato === REQUEST_STATUS.WAITING
  );
  const scheduledRequests = requests.filter(
    (r) => r.stato === REQUEST_STATUS.SCHEDULED
  );

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === "delete-request") {
      return handleDelete(confirmAction.requestId);
    }
    if (confirmAction.type === "reject-request") {
      return handleReject(confirmAction.requestId);
    }
    return handleCancelAppointment(confirmAction.appointmentId);
  };

  const confirmTitle = (() => {
    if (!confirmAction) return "";
    if (confirmAction.type === "delete-request") {
      return "Eliminare richiesta?";
    }
    if (confirmAction.type === "reject-request") {
      return "Rimuovere dalla lista d'attesa?";
    }
    return "Annullare appuntamento?";
  })();

  const confirmDescription = (() => {
    if (!confirmAction) return undefined;
    if (confirmAction.type === "delete-request") {
      return "La richiesta verrà eliminata definitivamente.";
    }
    if (confirmAction.type === "reject-request") {
      return "La richiesta verrà spostata in archivio.";
    }
    return "L'appuntamento sarà annullato e la richiesta tornerà in lista d'attesa.";
  })();

  const confirmLabel = (() => {
    if (!confirmAction) return "Conferma";
    if (confirmAction.type === "delete-request") {
      return "Elimina richiesta";
    }
    if (confirmAction.type === "reject-request") {
      return "Rimuovi";
    }
    return "Annulla appuntamento";
  })();

  const confirmVariant = confirmAction?.type === "reject-request" ? "default" : "destructive";

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
                        <AutoAssignDialog
                          requestId={request.id}
                          motivo={request.motivo}
                          patientName={`${request.patient.cognome} ${request.patient.nome}`}
                        />
                        <NoteEditor
                          requestId={request.id}
                          currentNote={request.note}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({
                              type: "reject-request",
                              requestId: request.id,
                            })
                          }
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
                            <span>
                              {formatDateTime(appointment.slot.startTime, {
                                weekday: "short",
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
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
                              onClick={() =>
                                setConfirmAction({
                                  type: "cancel-appointment",
                                  appointmentId: appointment.id,
                                })
                              }
                              title="Annulla appuntamento"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmAction({
                                type: "delete-request",
                                requestId: request.id,
                              })
                            }
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

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <ConfirmationDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        confirmVariant={confirmVariant}
        loadingLabel="Operazione in corso..."
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
