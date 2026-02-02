/**
 * Utility functions
 */

/**
 * Normalize phone number by removing all non-numeric characters
 * Matches legacy PHP: preg_replace('/[^0-9]/', '', $phone)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

/**
 * Format duration in minutes to "X시간 Y분"
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours > 0 && mins > 0) {
    return `${hours}시간 ${mins}분`
  } else if (hours > 0) {
    return `${hours}시간`
  } else {
    return `${mins}분`
  }
}
