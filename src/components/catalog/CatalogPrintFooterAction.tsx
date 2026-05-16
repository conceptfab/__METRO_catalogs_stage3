import Link from 'next/link';
import { Download } from 'lucide-react';

interface Props {
  catalogId: string;
}

export default function CatalogPrintFooterAction({ catalogId }: Props) {
  return (
    <div className="print-hide mx-auto mb-8 flex w-full max-w-[1440px] justify-center px-5 sm:px-8 lg:px-0">
      <Link
        href={`/api/catalog/${catalogId}/pdf`}
        rel="noopener noreferrer"
        aria-label="Download or print this catalog as PDF"
        className="inline-flex items-center gap-3 border-2 border-foreground bg-transparent px-8 py-4 text-base font-semibold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground hover:text-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Download size={20} strokeWidth={2} aria-hidden="true" />
        Download / Print
      </Link>
    </div>
  );
}
