import { ApiError } from "@/lib/api";

export type QueryErrorInfo = {
  message: string;
  unauthorized: boolean;
  forbidden: boolean;
};

/** Map API and network failures into UI copy. */
export function toQueryError(error: unknown): QueryErrorInfo {
  if (error instanceof ApiError) {
    if (error.isUnauthorized) {
      return {
        message: "Your session expired. Sign in again.",
        unauthorized: true,
        forbidden: false,
      };
    }
    if (error.isForbidden) {
      return {
        message: error.message || "You do not have access to this.",
        unauthorized: false,
        forbidden: true,
      };
    }
    return {
      message: error.message || "The request failed.",
      unauthorized: false,
      forbidden: false,
    };
  }

  if (error instanceof TypeError) {
    return {
      message:
        "Could not reach the server. Check your connection and try again.",
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
