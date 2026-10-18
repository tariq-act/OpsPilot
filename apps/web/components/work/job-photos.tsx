"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import {
  JOB_PHOTO_KIND_LABEL,
  JOB_PHOTO_KINDS,
} from "@/lib/job-photo-kind";
import { toUserErrorMessage } from "@/lib/query/errors";
import {
  useJobPhotoContentQuery,
  useUploadJobPhotoMutation,
} from "@/lib/query/jobs";
import type { JobPhoto, JobPhotoKind } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

type JobPhotosProps = {
  organizationId: string;
  jobId: string;
  photos: JobPhoto[];
  timeZone: string;
  canUpload: boolean;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
};

export function JobPhotos({
  organizationId,
  jobId,
  photos,
  timeZone,
  canUpload,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
}: JobPhotosProps) {
  const uploadMutation = useUploadJobPhotoMutation(organizationId);
  const [kind, setKind] = useState<JobPhotoKind>("OTHER");
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  async function submitUpload() {
    setLocalError(null);
    setLocalSuccess(null);
    if (!file) {
      setLocalError("Choose a photo to upload.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("Photo must be 10MB or smaller.");
      return;
    }
    try {
      setProgressLabel("Uploading…");
      await uploadMutation.mutateAsync({ id: jobId, kind, file });
      setFile(null);
      setLocalSuccess("Photo uploaded.");
    } catch (error) {
      setLocalError(toUserErrorMessage(error, "Unable to upload the photo."));
    } finally {
      setProgressLabel(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">Photos</h2>

      {canUpload ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="job-photo-kind">Kind</Label>
              <Select
                value={kind}
                onValueChange={(value) => setKind(value as JobPhotoKind)}
                disabled={uploadMutation.isPending}
              >
                <SelectTrigger id="job-photo-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_PHOTO_KINDS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {JOB_PHOTO_KIND_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="job-photo-file">File</Label>
              <input
                id="job-photo-file"
                type="file"
                accept={ACCEPTED}
                disabled={uploadMutation.isPending}
                className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  setFile(next);
                  setLocalError(null);
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => void submitUpload()}
              disabled={uploadMutation.isPending || !file}
            >
              {uploadMutation.isPending ? "Uploading…" : "Upload photo"}
            </Button>
            {progressLabel ? (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {progressLabel}
              </p>
            ) : null}
            {file && !uploadMutation.isPending ? (
              <p className="text-xs text-muted-foreground">
                {file.name} · {Math.round(file.size / 1024)} KB
              </p>
            ) : null}
          </div>
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
      ) : null}

      <div className="mt-4">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="aspect-video animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : isError ? (
          <div>
            <p role="alert" className="text-sm text-destructive">
              {errorMessage ?? "Unable to load photos."}
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
        ) : photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {photos.map((photo) => (
              <li key={photo.id}>
                <JobPhotoThumb
                  organizationId={organizationId}
                  jobId={jobId}
                  photo={photo}
                  timeZone={timeZone}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function JobPhotoThumb({
  organizationId,
  jobId,
  photo,
  timeZone,
}: {
  organizationId: string;
  jobId: string;
  photo: JobPhoto;
  timeZone: string;
}) {
  const contentQuery = useJobPhotoContentQuery(
    organizationId,
    jobId,
    photo.id,
  );

  const objectUrl = useMemo(() => {
    if (!contentQuery.data) return null;
    return URL.createObjectURL(contentQuery.data);
  }, [contentQuery.data]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-muted/30">
      <div className="aspect-video bg-muted">
        {contentQuery.isLoading ? (
          <div className="size-full animate-pulse bg-muted" />
        ) : contentQuery.isError || !objectUrl ? (
          <div className="flex size-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
            Preview unavailable
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- blob URL from authenticated fetch
          <img
            src={objectUrl}
            alt={`${JOB_PHOTO_KIND_LABEL[photo.kind]} photo ${photo.fileName}`}
            className="size-full object-cover"
          />
        )}
      </div>
      <figcaption className="space-y-0.5 p-3">
        <p className="text-sm font-medium text-foreground">
          {JOB_PHOTO_KIND_LABEL[photo.kind]}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {photo.fileName}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(photo.createdAt, timeZone)}
        </p>
      </figcaption>
    </figure>
  );
}
