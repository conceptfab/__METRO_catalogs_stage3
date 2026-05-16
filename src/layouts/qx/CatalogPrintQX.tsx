import type { CatalogData } from '@/types/catalog';
import HeroPrintQX from './HeroPrintQX';
import OverviewQX from './OverviewQX';
import GalleryPrintQX from './GalleryPrintQX';
import FinishesPrintQX from './FinishesPrintQX';
import DimensionsQX from './DimensionsQX';
import MaterialsQX from './MaterialsQX';
import FeaturesQX from './FeaturesQX';
import GettingStartedQX from './GettingStartedQX';
import PackshotsPrintQX from './PackshotsPrintQX';
import ProductCodesQX from './ProductCodesQX';

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
export default function CatalogPrintQX({ catalog }: Props) {
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
        <HeroPrintQX catalog={catalog} />
      </div>
      <div className="print-page print-page-overview">
        <OverviewQX data={catalog.overview} />
      </div>
      <div className="print-page print-page-gallery">
        <GalleryPrintQX catalog={catalog} />
      </div>
      <div className="print-page print-page-finishes">
        {/* Use materials.configurator (the metro_*.webp layered renders from
         * /catalogs/{id}/materials/) — NOT finishes.configurator, which only
         * contains flat shared swatches and would render as solid colour. */}
        <FinishesPrintQX
          data={catalog.finishes}
          configurator={catalog.materials.configurator}
          previewMode={catalog.materials.previewMode}
        />
      </div>
      {catalog.packshots && (
        // PackshotsPrintQX chunks items into pages of 4 and emits its own
        // .print-page wrappers — one per chunk.
        <PackshotsPrintQX
          data={catalog.packshots}
          materialsConfigurator={catalog.materials.configurator}
        />
      )}
      <div className="print-page print-page-dimensions">
        <DimensionsQX data={catalog.dimensions} />
      </div>
      <div className="print-page print-page-materials">
        <MaterialsQX data={catalog.materials} />
      </div>
      <div className="print-page print-page-features">
        <FeaturesQX data={catalog.features} />
      </div>
      <div className="print-page print-page-getting-started">
        <GettingStartedQX data={catalog.gettingStarted} />
      </div>
      <div className="print-page print-page-product-codes">
        <ProductCodesQX data={catalog.productCodes} />
      </div>
    </div>
  );
}
