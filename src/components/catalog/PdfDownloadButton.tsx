'use client';

import { useState, type MouseEvent } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface Props {
  catalogId: string;
}

export default function PdfDownloadButton({ catalogId }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isGenerating) {
      event.preventDefault();
      return;
    }

    // Intercept the navigation so we can show a loading state while the
    // server renders the PDF (typically 6–10s). On success we trigger the
    // download from a Blob URL; on failure we fall back to the plain href.
    event.preventDefault();
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/catalog/${catalogId}/pdf`);
      if (!response.ok) {
        throw new Error(`PDF endpoint returned ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const filenameHeader = response.headers.get('content-disposition');
      const filename =
        /filename="?([^";]+)"?/i.exec(filenameHeader ?? '')?.[1] ??
        `metro-${catalogId.toLowerCase()}.pdf`;

      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('PDF generation failed:', error);
      window.location.href = `/api/catalog/${catalogId}/pdf`;
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <a
      href={`/api/catalog/${catalogId}/pdf`}
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-busy={isGenerating}
      aria-disabled={isGenerating}
      aria-label={
        isGenerating
          ? 'Generating PDF, please wait'
          : 'Download PDF of this catalog'
      }
      className={`print-hide group fixed bottom-6 right-6 z-50 inline-flex min-h-[44px] items-center gap-3 bg-primary px-8 py-4 font-display text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        isGenerating ? 'cursor-wait opacity-90' : ''
      }`}
    >
      {isGenerating ? (
        <>
          <Loader2
            size={18}
            strokeWidth={2}
            className="animate-spin"
            aria-hidden="true"
          />
          <span>Generating PDF…</span>
        </>
      ) : (
        <>
          <Download size={18} strokeWidth={2} aria-hidden="true" />
          <span>Download PDF</span>
        </>
      )}
    </a>
  );
}
