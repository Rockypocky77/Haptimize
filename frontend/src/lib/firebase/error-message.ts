/**
 * Map Firestore / Firebase client errors to user-facing copy.
 * Avoid blaming "connection" for permission or config issues.
 */
export function firestoreUserMessage(err: unknown): string {
  const code =
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code?: unknown }).code === "string"
      ? (err as { code: string }).code
      : "";

  switch (code) {
    case "permission-denied":
      return "Could not save — permission denied. Try signing out and signing in again.";
    case "unauthenticated":
      return "You need to be signed in to save.";
    case "unavailable":
    case "deadline-exceeded":
      return "Could not reach the server. Check your connection and try again.";
    case "failed-precondition":
    case "aborted":
      return "Could not complete the request. Try again in a moment.";
    case "resource-exhausted":
      return "Service is busy. Please try again shortly.";
    default:
      if (
        typeof process !== "undefined" &&
        !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      ) {
        return "This build is missing Firebase configuration.";
      }
      return "Could not save your category. Try again.";
  }
}
