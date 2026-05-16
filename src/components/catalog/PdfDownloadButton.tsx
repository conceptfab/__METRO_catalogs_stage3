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
      aria-label="Pobierz PDF tego katalogu"
      className="print-hide fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold uppercase tracking-wide text-on-dark shadow-lg transition hover:bg-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Download size={18} strokeWidth={2} aria-hidden="true" />
      Pobierz PDF
    </Link>
  );
}
