export const normalizePhoneNumber = (value: string): string => {
  const digitsOnly = (value || '').replace(/[^\d+]/g, '');
  if (!digitsOnly) {
    return '';
  }

  const unsignedDigits = digitsOnly.replace(/\D/g, '');
  if (unsignedDigits.length === 10) {
    return `+91${unsignedDigits}`;
  }
  if (unsignedDigits.length === 12 && unsignedDigits.startsWith('91')) {
    return `+${unsignedDigits}`;
  }
  if (digitsOnly.startsWith('+')) {
    return `+${unsignedDigits}`;
  }
  return unsignedDigits ? `+${unsignedDigits}` : '';
};
