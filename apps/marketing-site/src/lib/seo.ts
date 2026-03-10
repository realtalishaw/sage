const BASE_TITLE = "Sage";

/**
 * Set the document title. Format: "Sage - {suffix}"
 * Pass empty string to use just "Sage".
 */
export function setPageTitle(suffix: string): void {
  document.title = suffix ? `${BASE_TITLE} - ${suffix}` : BASE_TITLE;
}
