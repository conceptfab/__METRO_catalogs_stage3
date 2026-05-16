'use client';

import { useEffect } from 'react';

/**
 * Mounted on /print routes. Waits for all <img> resources to finish loading,
 * then triggers the browser print dialog once. URL ?auto=0 disables the trigger
 * (useful when debugging the print layout in screen mode).
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

    let timerId: number | undefined;

    // Brief delay lets Next.js Image finish swapping placeholder → real bitmap
    // before the browser snapshots the page for the print dialog.
    const triggerPrint = () => {
      timerId = window.setTimeout(() => window.print(), 250);
    };

    const images = Array.from(document.images);
    const pending = images.filter((img) => !img.complete);

    if (pending.length === 0) {
      triggerPrint();
      return () => {
        if (timerId !== undefined) window.clearTimeout(timerId);
      };
    }

    let remaining = pending.length;
    const onDone = () => {
      remaining -= 1;
      if (remaining <= 0) triggerPrint();
    };

    pending.forEach((img) => {
      img.addEventListener('load', onDone, { once: true });
      img.addEventListener('error', onDone, { once: true });
    });

    return () => {
      pending.forEach((img) => {
        img.removeEventListener('load', onDone);
        img.removeEventListener('error', onDone);
      });
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, []);

  return null;
}
