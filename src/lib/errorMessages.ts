/**
 * Institutional-grade error message translations.
 * Maps common Supabase/network error patterns to professional copy.
 */

const ERROR_PATTERNS: [RegExp, string][] = [
  [/row.level security/i, "System was unable to complete this operation. Please verify your permissions or contact an Administrator."],
  [/permission denied/i, "Access denied. Your current role does not have permission for this action. Contact an Administrator to request access."],
  [/network|fetch|timeout|ECONNREFUSED/i, "Connection to the data service was interrupted. Please retry in a moment."],
  [/unique.*constraint|duplicate key/i, "This record already exists. Please review the existing entry or modify the values."],
  [/foreign key/i, "This operation references data that no longer exists. Please refresh and try again."],
  [/not authenticated|JWT expired|invalid token/i, "Your session has expired. Please sign in again to continue."],
  [/quota|rate limit|too many requests/i, "Request limit reached. Please wait a moment before trying again."],
  [/storage.*bucket|file.*upload/i, "File operation failed. Please verify the file format and size, then retry."],
  [/check.*violation|validation/i, "The submitted data did not pass validation. Please review the values and try again."],
];

export function getInstitutionalError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  
  for (const [pattern, response] of ERROR_PATTERNS) {
    if (pattern.test(message)) return response;
  }
  
  return "An unexpected error occurred. Please try again or contact support if the issue persists.";
}
