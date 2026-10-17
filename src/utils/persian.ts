/**
 * Persian Numbers, Formatting, and Solar Hijri (Shamsi) Date Utilities
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

/**
 * Converts English or Arabic digits in a string or number to Persian digits.
 */
export function toPersianDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str
    .replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w])
    .replace(/[٠-٩]/g, (w) => PERSIAN_DIGITS[ARABIC_DIGITS.indexOf(w)]);
}

/**
 * Converts Persian digits back to English digits (useful for API requests / inputs).
 */
export function toEnglishDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str.replace(/[۰-۹]/g, (w) => String(PERSIAN_DIGITS.indexOf(w)));
}

/**
 * Robust Gregorian to Jalali (Solar Hijri) Date Conversion
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

/**
 * Formats a timestamp into a Persian Solar (Shamsi) date string with Persian numerals.
 * Example output: "۹ مهر ۱۴۰۳"
 */
export function formatPersianDate(
  timestamp: number | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
    if (isNaN(date.getTime())) return '';

    // Standard modern Intl API check
    const formatted = new Intl.DateTimeFormat('fa-IR', {
      calendar: 'persian',
      numberingSystem: 'persian',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    }).format(date);
    return formatted;
  } catch {
    // Algorithmic Jalali fallback
    const d = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
    const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const monthName = PERSIAN_MONTHS[jm - 1] || '';
    return `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;
  }
}

/**
 * Formats a timestamp into short Shamsi numeric format: "۱۴۰۳/۰۷/۰۹"
 */
export function formatPersianDateShort(timestamp: number | Date): string {
  const d = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  if (isNaN(d.getTime())) return '';
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const pad = (n: number) => (n < 10 ? `۰${toPersianDigits(n)}` : toPersianDigits(n));
  return `${toPersianDigits(jy)}/${pad(jm)}/${pad(jd)}`;
}

/**
 * Formats a number with comma thousands separators and Persian digits.
 */
export function formatPersianNumber(num: number | string): string {
  if (num === null || num === undefined) return '';
  const parts = String(num).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return toPersianDigits(parts.join('.'));
}

/**
 * Formats currency in Tomans with Persian digits.
 */
export function formatTomans(amount: number): string {
  return `${formatPersianNumber(amount)} تومان`;
}
