import escapeStringRegexp from 'escape-string-regexp';

export default function escapedRegex(text: string) {
  const trimmedText = text?.trim();
  const escapedText = escapeStringRegexp(trimmedText || '');
  const pattern = `^${escapedText}$`;
  const regex = new RegExp(pattern, 'i');
  return regex;
}
