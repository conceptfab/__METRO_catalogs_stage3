import Link from 'next/link';
import { Download } from 'lucide-react';

interface Props {
  catalogId: string;
}

export default function PdfDownloadButton({ catalogId }: Props) {
  return (
    <Link
      href={`/api/catalog/${catalogId}/pdf`}
      rel="noopener noreferrer"
      aria-label="Download PDF of this catalog"
      className="print-hide group fixed bottom-6 right-6 z-50 inline-flex min-h-[44px] items-center gap-3 bg-primary px-8 py-4 font-display text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Download size={18} strokeWidth={2} aria-hidden="true" />
      <span>Download PDF</span>
    </Link>
  );
}
