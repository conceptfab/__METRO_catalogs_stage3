import type { CatalogData } from '@/types/catalog';
import HeroPrintQX from './HeroPrintQX';
import OverviewQX from './OverviewQX';
import GalleryPrintQX from './GalleryPrintQX';
import FinishesQX from './FinishesQX';
import DimensionsQX from './DimensionsQX';
import MaterialsQX from './MaterialsQX';
import FeaturesQX from './FeaturesQX';
import GettingStartedQX from './GettingStartedQX';
import PackshotsQX from './PackshotsQX';
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
        <FinishesQX
          data={catalog.finishes}
          configurator={
            catalog.finishes.configurator ?? catalog.materials.configurator
          }
        />
      </div>
      {catalog.packshots && (
        <div className="print-page print-page-packshots">
          <PackshotsQX
            data={catalog.packshots}
            materialsConfigurator={catalog.materials.configurator}
          />
        </div>
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
