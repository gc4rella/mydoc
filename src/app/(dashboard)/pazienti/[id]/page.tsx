import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientForm } from "@/components/pazienti/patient-form";
import { UrgenzaBadge } from "@/components/richieste/status-badge";
import { getPatient, deletePatient } from "@/actions/pazienti";
import { getRequestsByPatient } from "@/actions/richieste";
import { getAppointments } from "@/actions/appointments";
import { AddToWaitingList } from "@/components/pazienti/add-to-waiting-list";
import { PatientRequestActions } from "@/components/pazienti/patient-request-actions";
import { ArrowLeft, Trash2, Clock, Calendar, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DettaglioPazientePage({ params }: PageProps) {
  const { id } = await params;
  const [patient, requests, appointments] = await Promise.all([
    getPatient(id),
    getRequestsByPatient(id),
    getAppointments(),
  ]);

  if (!patient) {
    notFound();
  }

  // Map appointments by request ID
  const appointmentMap = new Map(
    appointments.map((a) => [a.requestId, a])
  );

  const deleteWithId = deletePatient.bind(null, id);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const waitingRequests = requests.filter((r) => r.stato === "waiting");
  const scheduledRequests = requests.filter((r) => r.stato === "scheduled");
  const pastRequests = requests.filter((r) => r.stato === "rejected");

  return (
    <div>
      <Header title={`${patient.cognome} ${patient.nome}`}>
        <Button variant="ghost" asChild>
          <Link href="/pazienti">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Link>
        </Button>
        <form action={deleteWithId}>
          <Button variant="destructive" type="submit">
            <Trash2 className="h-4 w-4 mr-2" />
            Elimina
          </Button>
        </form>
      </Header>
      <div className="p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Patient Details */}
          <PatientForm patient={patient} />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Azioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddToWaitingList patientId={patient.id} />
              <div className="text-sm text-muted-foreground">
                {waitingRequests.length > 0 && (
                  <p>{waitingRequests.length} richieste in attesa</p>
                )}
                {scheduledRequests.length > 0 && (
                  <p>{scheduledRequests.length} appuntamenti programmati</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scheduled Appointments */}
        {scheduledRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Appuntamenti Programmati
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scheduledRequests.map((request) => {
                  const appointment = appointmentMap.get(request.id);
                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{request.motivo}</p>
                        {appointment && (
                          <p className="text-sm flex items-center gap-1 text-green-700">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(appointment.slot.startTime)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <UrgenzaBadge urgenza={request.urgenza as "bassa" | "media" | "alta"} />
                        {appointment && (
                          <PatientRequestActions
                            request={request}
                            appointment={appointment}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Waiting List */}
        {waitingRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                In Lista d&#39;Attesa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {waitingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{request.motivo}</p>
                      <p className="text-sm text-muted-foreground">
                        Aggiunto il {formatDate(request.createdAt)}
                      </p>
                      {request.note && (
                        <p className="text-sm text-muted-foreground">{request.note}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <UrgenzaBadge urgenza={request.urgenza as "bassa" | "media" | "alta"} />
                      <PatientRequestActions request={request} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Past/Rejected */}
        {pastRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground">Archivio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pastRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-2 text-sm text-muted-foreground"
                  >
                    <span>{request.motivo}</span>
                    <span>{formatDate(request.createdAt)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {requests.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nessuna richiesta per questo paziente
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
