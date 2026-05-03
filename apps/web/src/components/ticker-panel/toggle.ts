/**
 * Pure toggle logic for the ticker filter. Extracted so the rule
 * — "click the active symbol again to clear" — is unit-testable
 * without mounting the panel.
 */
export function nextTickerFilter(
  current: string | null,
  clicked: string,
): string | null {
  return current === clicked ? null : clicked;
}
