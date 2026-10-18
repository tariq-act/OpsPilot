import type { JobPhotoKind } from "@/lib/types";

export const JOB_PHOTO_KIND_LABEL: Record<JobPhotoKind, string> = {
  BEFORE: "Before",
  AFTER: "After",
  OTHER: "Other",
};

export const JOB_PHOTO_KINDS: JobPhotoKind[] = ["BEFORE", "AFTER", "OTHER"];
