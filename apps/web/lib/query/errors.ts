import { ApiError } from "@/lib/api";

export type QueryErrorInfo = {
  message: string;
  unauthorized: boolean;
  forbidden: boolean;
};

/**
 * User-facing copy for API failures.
 * Prefer stable UI messages over raw Nest stack/error names.
 * Validation (400) may surface the backend message when it is a short string.
 */
export function toUserErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof ApiError) {
    if (error.isUnauthorized) {
      return "Your session expired. Sign in again.";
    }
    if (error.isForbidden) {
      return "You do not have permission to do this.";
    }
    if (error.isNotFound) {
      return "This record could not be found.";
    }
    if (error.status === 409) {
      return "That action is not allowed for the current status.";
    }
    if (error.status === 400) {
      const message = error.body.message;
      if (
        typeof message === "string" &&
        message.length > 0 &&
        message.length <= 200 &&
        !message.includes("\n")
      ) {
        return message;
      }
      return "Some fields are invalid. Check your input and try again.";
    }
    return fallback;
  }

  if (error instanceof TypeError) {
    return "Could not reach the server. Check your connection and try again.";
  }

  return fallback;
}

/** Map API and network failures into UI copy for query states. */
export function toQueryError(error: unknown): QueryErrorInfo {
  if (error instanceof ApiError) {
    if (error.isUnauthorized) {
      return {
        message: toUserErrorMessage(error),
        unauthorized: true,
        forbidden: false,
      };
    }
    if (error.isForbidden) {
      return {
        message: toUserErrorMessage(error),
        unauthorized: false,
        forbidden: true,
      };
    }
    return {
      message: toUserErrorMessage(error, "Unable to load this right now."),
      unauthorized: false,
      forbidden: false,
    };
  }

  if (error instanceof TypeError) {
    return {
      message: toUserErrorMessage(error),
      unauthorized: false,
      forbidden: false,
    };
  }

  return {
    message: "Something went wrong while loading this.",
    unauthorized: false,
    forbidden: false,
  };
}
