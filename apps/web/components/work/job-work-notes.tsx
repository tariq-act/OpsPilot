"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { toUserErrorMessage } from "@/lib/query/errors";
import { useCreateJobNoteMutation } from "@/lib/query/jobs";
import type { JobNote } from "@/lib/types";

type JobWorkNotesProps = {
  organizationId: string;
  jobId: string;
  notes: JobNote[];
  timeZone: string;
  authorNameById?: Map<string, string>;
  canAdd: boolean;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
};

export function JobWorkNotes({
  organizationId,
  jobId,
  notes,
  timeZone,
  authorNameById,
  canAdd,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
}: JobWorkNotesProps) {
  const createNote = useCreateJobNoteMutation(organizationId);
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  async function submitNote() {
    setLocalError(null);
    setLocalSuccess(null);
    const trimmed = body.trim();
    if (!trimmed) {
      setLocalError("Note body is required.");
      return;
    }
    try {
      await createNote.mutateAsync({ id: jobId, body: { body: trimmed } });
      setBody("");
      setLocalSuccess("Note added.");
    } catch (error) {
      setLocalError(toUserErrorMessage(error, "Unable to add the note."));
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">Work notes</h2>

      {canAdd ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="work-note-body">Add note</Label>
            <Textarea
              id="work-note-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={5000}
              rows={3}
              disabled={createNote.isPending}
              placeholder="What happened on site?"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => void submitNote()}
              disabled={createNote.isPending}
            >
              {createNote.isPending ? "Saving…" : "Add note"}
            </Button>
            {localError ? (
              <p role="alert" className="text-sm text-destructive">
                {localError}
              </p>
            ) : null}
            {localSuccess ? (
              <p className="text-sm text-foreground" aria-live="polite">
                {localSuccess}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        ) : isError ? (
          <div>
            <p role="alert" className="text-sm text-destructive">
              {errorMessage ?? "Unable to load notes."}
            </p>
            {onRetry ? (
              <button
                type="button"
                className="mt-2 text-sm font-medium text-primary hover:underline"
                onClick={onRetry}
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No work notes yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {notes.map((note) => (
              <li key={note.id} className="py-3 first:pt-0 last:pb-0">
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {note.body}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {authorNameById?.get(note.createdBy) ?? "Team member"} ·{" "}
                  {formatDateTime(note.createdAt, timeZone)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
