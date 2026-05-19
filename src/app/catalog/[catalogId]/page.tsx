import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactDOM from 'react-dom';
import {
  loadCatalog,
  getGlobalConfig,
  getCatalogList,
  getCatalogFooterEntries,
} from '@/lib/catalog-loader';
import type { CatalogLayoutType, HeroData } from '@/types/catalog';
import { responsiveProps } from '@/lib/responsive-image';
import CatalogPageQX from '@/layouts/qx/CatalogPageQX';
import CatalogPageMCR800 from '@/layouts/mcr800/CatalogPageMCR800';
import CatalogPagePlaceholder from '@/components/catalog/CatalogPagePlaceholder';

function getFirstHeroSrc(hero: HeroData): string | undefined {
  const initialIdx = Math.max(0, hero.slider?.initialSlide ?? 0);
  if (hero.heroSlides?.length) {
    return hero.heroSlides[Math.min(initialIdx, hero.heroSlides.length - 1)]?.src;
  }
  if (hero.heroImages?.length) {
    return hero.heroImages[Math.min(initialIdx, hero.heroImages.length - 1)];
  }
  return hero.heroImage;
}

const layoutMap: Record<
  CatalogLayoutType,
  typeof CatalogPageQX | typeof CatalogPageMCR800 | typeof CatalogPagePlaceholder
> = {
  qx: CatalogPageQX,
  mcr800: CatalogPageMCR800,
  type2: CatalogPagePlaceholder,
  type3: CatalogPagePlaceholder,
};

export async function generateStaticParams() {
  const catalogs = await getCatalogList();
  return catalogs.map((catalog) => ({
    catalogId: catalog.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const catalog = await loadCatalog(resolvedParams.catalogId);
  if (!catalog) return {};

  const { title, tagline } = catalog.meta;
  return {
    title: tagline ? `${title} — ${tagline}` : title,
  };
}

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}) {
  const resolvedParams = await params;
  const [catalog, globalConfig, footerEntries] = await Promise.all([
    loadCatalog(resolvedParams.catalogId),
    getGlobalConfig(),
    getCatalogFooterEntries(),
  ]);

  if (!catalog) {
    notFound();
  }

  const firstHeroSrc = getFirstHeroSrc(catalog.hero);
  if (firstHeroSrc) {
    const responsive = responsiveProps(firstHeroSrc, 'hero');
    ReactDOM.preload(firstHeroSrc, {
      as: 'image',
      fetchPriority: 'high',
      imageSrcSet: responsive?.srcSet,
      imageSizes: responsive?.sizes,
    });
  }

  const LayoutComponent = layoutMap[catalog.meta.layoutType];
  return (
    <LayoutComponent
      catalog={catalog}
      globalConfig={globalConfig}
      footerEntries={footerEntries}
    />
  );
}
