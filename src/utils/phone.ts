export function normalizePhoneNumber(value: string): string {
  return value.replace(/[^\d+]/g, '').trim();
}

export function isValidPhoneNumber(value: string): boolean {
  const normalized = normalizePhoneNumber(value);
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function formatPhoneDisplay(value: string): string {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) return value;
  return normalized;
}

export function buildTelUrl(phoneNumber: string): string {
  return `tel:${normalizePhoneNumber(phoneNumber)}`;
}
