import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadCatalog, getCatalogList } from '@/lib/catalog-loader';
import CatalogPrintQX from '@/layouts/qx/CatalogPrintQX';
import PrintAutoTrigger from '@/components/catalog/PrintAutoTrigger';

export async function generateStaticParams() {
  const catalogs = await getCatalogList();
  return catalogs.map((catalog) => ({ catalogId: catalog.id }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CatalogPrintPage({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}) {
  const resolvedParams = await params;
  const catalog = await loadCatalog(resolvedParams.catalogId);

  if (!catalog) {
    notFound();
  }

  // Print route currently supports the QX layout only — extend as new layouts come online.
  if (catalog.meta.layoutType !== 'qx') {
    notFound();
  }

  return (
    <>
      <CatalogPrintQX catalog={catalog} />
      <PrintAutoTrigger />
    </>
  );
}
