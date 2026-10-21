/** Joins the truthy class names, so primitives can merge variant classes with conditional ones. */
export function cn(...classNames: ReadonlyArray<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}
