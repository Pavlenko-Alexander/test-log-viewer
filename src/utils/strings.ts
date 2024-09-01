export function joinStrings<T>(strings: T[], delimiter = " "): string {
  return strings.filter((s) => s && typeof s === "string").join(delimiter);
}
