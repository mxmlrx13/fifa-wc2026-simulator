/**
 * Classname helper - combines class strings, filtering out falsy values.
 * No external dependency required.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
