// Pure validation helpers — return an error string or "" on success.

export function validateEmail(value: string): string {
  if (!value.trim()) return "Email is required.";
  // RFC-5321-ish: local@domain.tld
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(value.trim())) return "Please enter a valid email address.";
  return "";
}

// Accepts common phone formats; requires 10–15 digits (NANP + intl).
export function validatePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Phone number is required.";
  if (!/^[0-9+()\-.\s]+$/.test(trimmed))
    return "Phone may only contain digits, spaces, and + - ( ).";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10) return "Please enter a valid phone number.";
  if (digits.length > 15) return "Phone number is too long.";
  return "";
}

// Allows Latin letters, accented chars (French Canadian), spaces, hyphens, apostrophes.
export function validateName(value: string): string {
  if (!value.trim()) return "Name is required.";
  if (value.trim().length < 2) return "Name must be at least 2 characters.";
  const re = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
  if (!re.test(value.trim()))
    return "Name may only contain letters, spaces, hyphens, or apostrophes.";
  return "";
}

export function validateNumber(
  value: string,
  opts: { min?: number; max?: number; mustBeInteger?: boolean }
): string {
  if (!value.trim()) return "Please enter a number.";
  const num = Number(value);
  if (isNaN(num)) return "Please enter a valid number.";
  if (opts.mustBeInteger && !Number.isInteger(num))
    return "Please enter a whole number (no decimals).";
  if (opts.min !== undefined && num < opts.min)
    return `Minimum value is ${opts.min.toLocaleString()}.`;
  if (opts.max !== undefined && num > opts.max)
    return `Maximum value is ${opts.max.toLocaleString()}.`;
  return "";
}

export function validateCurrency(
  raw: string,
  opts: { min?: number; max?: number }
): string {
  const num = Number(raw.replace(/[^0-9.]/g, ""));
  if (!raw || isNaN(num) || num === 0)
    return "Please enter a valid CAD amount.";
  if (opts.min !== undefined && num < opts.min)
    return `Minimum is $${opts.min.toLocaleString()} CAD.`;
  if (opts.max !== undefined && num > opts.max)
    return `Maximum is $${opts.max.toLocaleString()} CAD.`;
  return "";
}

export function validateDate(
  value: string,
  opts: { minDate?: string; maxDate?: string; allowFuture?: boolean; allowPast?: boolean }
): string {
  if (!value) return "Please select a date.";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Please enter a valid date.";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (opts.allowFuture === false && d > today)
    return "Date cannot be in the future.";
  if (opts.allowPast === false && d < today)
    return "Date cannot be in the past.";
  if (opts.minDate && value < opts.minDate)
    return `Date must be on or after ${new Date(opts.minDate).toLocaleDateString("en-CA")}.`;
  if (opts.maxDate && value > opts.maxDate)
    return `Date must be on or before ${new Date(opts.maxDate).toLocaleDateString("en-CA")}.`;
  return "";
}
