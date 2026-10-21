// Display formatting shared by every screen. The only place that uses `Intl`.

/** Up to two initials from a person's name, e.g. "Demo HR Manager" → "DH"; "?" for a blank name. */
export function formatInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return initials || "?";
}
