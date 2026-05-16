'use client';

import { useEffect } from 'react';

/**
 * Mounted on /print routes. Adds body.print-preview class when ?auto=0 is set
 * so the page renders A4 boundaries on screen for visual debugging.
 *
 * The auto window.print() behavior was removed once /api/catalog/[id]/pdf
 * took over server-side PDF generation — users now click the download button
 * instead of being surprised by a print dialog.
 */
export default function PrintAutoTrigger() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('auto') === '0') {
      document.body.classList.add('print-preview');
      return () => {
        document.body.classList.remove('print-preview');
      };
    }
  }, []);

  return null;
}
