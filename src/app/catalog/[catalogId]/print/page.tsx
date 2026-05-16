import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadCatalog, getCatalogList } from '@/lib/catalog-loader';
import CatalogPrintQX from '@/layouts/qx/CatalogPrintQX';
import PrintAutoTrigger from '@/components/catalog/PrintAutoTrigger';
import PdfDownloadButton from '@/components/catalog/PdfDownloadButton';

export async function generateStaticParams() {
  const catalogs = await getCatalogList();
  return catalogs.map((catalog) => ({ catalogId: catalog.id }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Render fresh per request so random preview choices in FinishesPrintQX
// re-roll on every PDF generation (Puppeteer navigates to this URL each call).
export const dynamic = 'force-dynamic';

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
      {/* Visible when a user manually opens /print; hidden by .print-hide
       * during Puppeteer's page.pdf() because that uses @media print. */}
      <PdfDownloadButton catalogId={catalog.id} />
    </>
  );
}
