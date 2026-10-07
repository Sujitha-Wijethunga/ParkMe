/**
 * Sri Lankan local time formatting utilities.
 * Sri Lanka observes UTC+05:30 (Asia/Colombo) year-round without daylight saving time.
 */

const SRI_LANKA_TIMEZONE = 'Asia/Colombo';

export function parseDate(value: string | Date | number | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format time in Sri Lankan local time (e.g. "02:30 PM")
 */
export function formatSriLankanTime(value: string | Date | number | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '—';
  try {
    return d.toLocaleTimeString('en-US', {
      timeZone: SRI_LANKA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    // Fallback if environment lacks timezone database
    const utcMs = d.getTime();
    const slMs = utcMs + 5.5 * 3600 * 1000;
    const slDate = new Date(slMs);
    let hours = slDate.getUTCHours();
    const minutes = slDate.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  }
}

/**
 * Format date in Sri Lankan local time (e.g. "07 Oct 2026")
 */
export function formatSriLankanDate(value: string | Date | number | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '—';
  try {
    return d.toLocaleDateString('en-GB', {
      timeZone: SRI_LANKA_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    const utcMs = d.getTime();
    const slMs = utcMs + 5.5 * 3600 * 1000;
    const slDate = new Date(slMs);
    const day = slDate.getUTCDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[slDate.getUTCMonth()]} ${slDate.getUTCFullYear()}`;
  }
}

/**
 * Format both date and time in Sri Lankan local time (e.g. "07 Oct 2026, 02:30 PM")
 */
export function formatSriLankanDateTime(value: string | Date | number | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '—';
  return `${formatSriLankanDate(d)}, ${formatSriLankanTime(d)}`;
}
