import type { CatalogData } from '@/types/catalog';
import HeroPrintMCR800 from './HeroPrintMCR800';
import OverviewMCR800 from './OverviewMCR800';
import GalleryPrintMCR800 from './GalleryPrintMCR800';
import FinishesPrintMCR800 from './FinishesPrintMCR800';
import DimensionsMCR800 from './DimensionsMCR800';
import ArrangementsPrintMCR800 from './ArrangementsPrintMCR800';
import MaterialsPrintMCR800 from './MaterialsPrintMCR800';
import FeaturesPrintMCR800 from './FeaturesPrintMCR800';
import GettingStartedMCR800 from './GettingStartedMCR800';
import PackshotsPrintMCR800 from './PackshotsPrintMCR800';
import ProductCodesMCR800 from './ProductCodesMCR800';
import ContactPrintMCR800 from './ContactPrintMCR800';

interface Props {
  catalog: CatalogData;
}

/**
 * Print-only layout. Each section is wrapped in a .print-page container
 * (297×210mm) with page-break-after: always so the browser produces one
 * A4 landscape page per section when printing.
 *
 * No nav, no footer, no scroll animations — pure paged document.
 */
export default function CatalogPrintMCR800({ catalog }: Props) {
  const themeClassName = catalog.meta.theme
    ? `catalog-${catalog.meta.theme}`
    : undefined;
  const idClassName = catalog.id
    ? `catalog-id-${catalog.id.toLowerCase()}`
    : undefined;
  const rootClassName = [themeClassName, idClassName, 'catalog-print']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>
      <div className="print-page print-page-hero">
        <HeroPrintMCR800 catalog={catalog} />
      </div>
      <div className="print-page print-page-overview">
        <OverviewMCR800 data={catalog.overview} />
      </div>
      <div className="print-page print-page-gallery">
        <GalleryPrintMCR800 catalog={catalog} />
      </div>
      <div className="print-page print-page-finishes">
        <FinishesPrintMCR800 data={catalog.finishes} />
      </div>
      {catalog.packshots && (
        // PackshotsPrintMCR800 chunks items into pages of 4 and emits its own
        // .print-page wrappers — one per chunk.
        <PackshotsPrintMCR800 data={catalog.packshots} />
      )}
      <div className="print-page print-page-dimensions">
        <DimensionsMCR800 data={catalog.dimensions} />
      </div>
      {/* ArrangementsPrintMCR800 chunks the sample arrangements into pages of 4
       * and emits its own .print-page wrappers — one per chunk. Renders nothing
       * when the catalog has no arrangements data. Mirrors the on-screen order:
       * Dimensions → Arrangements → Materials. */}
      <ArrangementsPrintMCR800 data={catalog.arrangements} />
      {/* MaterialsPrintMCR800 chunks the 8 set illustrations into pages of 4
       * and emits its own .print-page wrappers — one per chunk. */}
      <MaterialsPrintMCR800 data={catalog.materials} />
      {/* FeaturesPrintMCR800 emits its own .print-page wrappers — one per chunk
       * of 3 features. */}
      <FeaturesPrintMCR800 data={catalog.features} />
      <div className="print-page print-page-getting-started">
        <GettingStartedMCR800 data={catalog.gettingStarted} />
      </div>
      <div className="print-page print-page-product-codes">
        <ProductCodesMCR800 data={catalog.productCodes} />
      </div>
      {/* Shared contact section — same content across all catalogs. */}
      <ContactPrintMCR800 />
    </div>
  );
}
