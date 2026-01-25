"use client";

import { useState } from "react";
import { updateRequestNote } from "@/actions/richieste";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MessageSquare, MessageSquarePlus } from "lucide-react";

interface NoteEditorProps {
  requestId: string;
  currentNote: string | null;
}

export function NoteEditor({ requestId, currentNote }: NoteEditorProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(currentNote || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateRequestNote(requestId, note);
    setSaving(false);
    setOpen(false);
  };

  const hasNote = currentNote && currentNote.trim().length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={hasNote ? "text-blue-600" : "text-muted-foreground"}
          title={hasNote ? currentNote : "Aggiungi nota"}
        >
          {hasNote ? (
            <MessageSquare className="h-4 w-4" />
          ) : (
            <MessageSquarePlus className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="text-sm font-medium">Note</div>
          <Textarea
            placeholder="Aggiungi una nota..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annulla
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "..." : "Salva"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
