import Image from 'next/image';
import Link from 'next/link';
import type { CatalogData } from '@/types/catalog';
import type { CatalogFooterEntry, GlobalConfig } from '@/lib/catalog-loader';
import CatalogNav from '@/components/catalog/CatalogNav';
import CatalogMotion from '@/components/catalog/CatalogMotion';
import HeroMCR800 from './HeroMCR800';
import OverviewMCR800 from './OverviewMCR800';
import GalleryMCR800 from './GalleryMCR800';
import FinishesMCR800 from './FinishesMCR800';
import DimensionsMCR800 from './DimensionsMCR800';
import MaterialsMCR800 from './MaterialsMCR800';
import FeaturesMCR800 from './FeaturesMCR800';
import GettingStartedMCR800 from './GettingStartedMCR800';
import PackshotsMCR800 from './PackshotsMCR800';
import ProductCodesMCR800 from './ProductCodesMCR800';
import PdfDownloadButton from '@/components/catalog/PdfDownloadButton';

interface Props {
  catalog: CatalogData;
  globalConfig: GlobalConfig;
  footerEntries?: CatalogFooterEntry[];
}

const EMPTY_FOOTER_ENTRIES: CatalogFooterEntry[] = [];

export default function CatalogPageMCR800({
  catalog,
  globalConfig,
  footerEntries = EMPTY_FOOTER_ENTRIES,
}: Props) {
  const themeClassName = catalog.meta.theme
    ? `catalog-${catalog.meta.theme}`
    : undefined;
  const idClassName = catalog.id
    ? `catalog-id-${catalog.id.toLowerCase()}`
    : undefined;
  const pageClassName = [themeClassName, idClassName, 'catalog-motion-slow']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={pageClassName}>
      <CatalogMotion>
        <a href="#overview" className="skip-link">
          Skip to main content
        </a>

        <CatalogNav
          sections={catalog.sections}
          brandLabel={(
            catalog.meta.brandName ?? globalConfig?.brandName ?? catalog.hero.brandLabel
          ).toUpperCase()}
          brandLogoSrc="/catalogs/MCR800/metro_logo.svg"
          variant="qx0"
        />

        <main
          id="main-content"
          className="bg-surface-elevated [&>section+section]:mt-12 sm:[&>section+section]:mt-20 lg:[&>section+section]:mt-[240px]"
        >
          <HeroMCR800 data={catalog.hero} />
          <OverviewMCR800 data={catalog.overview} />
          <GalleryMCR800 data={catalog.gallery} />
          <FinishesMCR800 data={catalog.finishes} />
          {catalog.packshots && <PackshotsMCR800 data={catalog.packshots} />}
          <DimensionsMCR800 data={catalog.dimensions} />
          <MaterialsMCR800 data={catalog.materials} />
          <FeaturesMCR800 data={catalog.features} />
          <GettingStartedMCR800 data={catalog.gettingStarted} />
          <ProductCodesMCR800 data={catalog.productCodes} />
        </main>

        <footer className="bg-white py-10">
          <nav
            aria-label="Other catalogs"
            className="mx-auto grid w-full max-w-[1440px] grid-cols-2 gap-3 px-5 sm:grid-cols-4 sm:px-8 lg:grid-cols-8 lg:px-0"
          >
            {Array.from({ length: 8 }).map((_, index) => {
              const entry = footerEntries[index];
              if (!entry) {
                return (
                  <div
                    key={`placeholder-${index}`}
                    aria-hidden="true"
                    className="aspect-square w-full bg-surface-elevated/55"
                  />
                );
              }
              const isCurrent = entry.id === catalog.id;
              return (
                <Link
                  key={entry.id}
                  href={entry.href}
                  aria-current={isCurrent ? 'page' : undefined}
                  aria-label={entry.label}
                  className="group relative block aspect-square w-full overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  <Image
                    src={entry.thumbnail}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 180px, (min-width: 640px) 25vw, 50vw"
                    className="object-cover grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 font-display text-xl font-bold uppercase tracking-widest text-on-dark opacity-0 transition-all duration-300 group-hover:bg-black/40 group-hover:opacity-100">
                    {entry.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </footer>
        <div className="bg-white py-6">
          <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-0">
            <Image
              src="/banner.webp"
              alt="Fundusze Europejskie dla Nowoczesnej Gospodarki — Rzeczpospolita Polska — Dofinansowane przez Unię Europejską — PARP Grupa PFR"
              width={2545}
              height={218}
              sizes="(min-width: 1440px) 864px, (min-width: 1024px) 60vw, 90vw"
              className="mx-auto block h-auto w-[90%] lg:w-[60%]"
            />
          </div>
        </div>
        <PdfDownloadButton catalogId={catalog.id} />
      </CatalogMotion>
    </div>
  );
}
