"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAutoAssignProposal,
  scheduleRequest,
  type AutoAssignProposal,
} from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/datetime";
import { CalendarCheck2, Loader2, Zap } from "lucide-react";

interface AutoAssignDialogProps {
  requestId: string;
  motivo: string;
  patientName?: string;
  disabled?: boolean;
}

type ProposalState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; proposal: AutoAssignProposal };

export function AutoAssignDialog({
  requestId,
  motivo,
  patientName,
  disabled = false,
}: AutoAssignDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const proposalFetchIdRef = useRef(0);
  const [proposalState, setProposalState] = useState<ProposalState>({
    status: "idle",
  });

  const closeDialog = () => {
    proposalFetchIdRef.current += 1;
    setSubmitError(null);
    setProposalState({ status: "idle" });
    setOpen(false);
  };

  const loadProposal = async () => {
    const fetchId = ++proposalFetchIdRef.current;
    setProposalState({ status: "loading" });
    setSubmitError(null);

    const result = await getAutoAssignProposal(requestId);
    if (fetchId !== proposalFetchIdRef.current) return;

    if ("error" in result) {
      setProposalState({ status: "error", message: result.error });
      return;
    }

    setProposalState({ status: "ready", proposal: result });
  };

  const handleConfirm = async () => {
    if (proposalState.status !== "ready") return;

    setSubmitting(true);
    setSubmitError(null);

    const result = await scheduleRequest(requestId, proposalState.proposal.slot.id);
    if (result.error) {
      setSubmitError(result.error);
      setSubmitting(false);
      return;
    }

    closeDialog();
    setSubmitting(false);
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (submitting) return;
        if (nextOpen) {
          setOpen(true);
          void loadProposal();
        } else {
          closeDialog();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          title="Assegna primo slot disponibile"
        >
          <Zap className="h-4 w-4 text-amber-600" />
        </Button>
      </DialogTrigger>

      <DialogContent showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>Conferma auto-assegnazione</DialogTitle>
          <DialogDescription>
            Verifica lo slot proposto prima di confermare la prenotazione.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            {patientName && <div className="font-medium">{patientName}</div>}
            <div className={patientName ? "text-sm text-muted-foreground" : "font-medium"}>
              {motivo}
            </div>
          </div>

          {proposalState.status === "loading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ricerca del primo slot disponibile...
            </div>
          )}

          {proposalState.status === "error" && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {proposalState.message}
            </div>
          )}

          {proposalState.status === "ready" && (
            <div className="rounded-lg border p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Slot proposto
              </div>
              <div className="mt-2 flex items-center gap-2 font-medium">
                <CalendarCheck2 className="h-4 w-4 text-green-600" />
                <span>
                  {formatDateTime(proposalState.proposal.slot.startTime, {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDateTime(proposalState.proposal.slot.startTime, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                -{" "}
                {formatDateTime(proposalState.proposal.slot.endTime, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                ({proposalState.proposal.slot.durationMinutes} min)
              </div>
            </div>
          )}

          {submitError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={closeDialog}
          >
            Annulla
          </Button>
          <Button
            type="button"
            disabled={proposalState.status !== "ready" || submitting}
            onClick={handleConfirm}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Prenotazione...
              </>
            ) : (
              "Accetta e prenota"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
