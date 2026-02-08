export const APP_LOCALE = "it-IT";

// Render times consistently across SSR/CSR (Cloudflare runtime defaults to UTC).
// The app is for a single-doctor studio; we display times in the clinic timezone.
export const APP_TIME_ZONE = "Europe/Rome";

export function formatDateTime(
  date: Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    ...options,
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

