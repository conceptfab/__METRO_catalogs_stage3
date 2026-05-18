/**
 * Layout types that have a printable variant (Hero/Print components + CatalogPrint orchestrator).
 * Used by generate-catalog-pdfs.mjs and verify-catalog-pdfs.mjs to filter catalogs to process.
 */
export const PRINTABLE_LAYOUTS = new Set(['qx', 'mcr800']);

export function isPrintableLayout(layoutType) {
  return PRINTABLE_LAYOUTS.has(layoutType);
}
