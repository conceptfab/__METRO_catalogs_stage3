import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { loadCatalog } from '@/lib/catalog-loader';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const LOCAL_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

async function launchBrowser() {
  const isServerless =
    process.env.VERCEL === '1' ||
    !!process.env.AWS_LAMBDA_FUNCTION_VERSION;

  const puppeteer = (await import('puppeteer-core')).default;

  if (isServerless) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1920, height: 1358, deviceScaleFactor: 1 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    LOCAL_CHROME_PATHS.find((p) => {
      try {
        return require('node:fs').existsSync(p);
      } catch {
        return false;
      }
    });

  if (!executablePath) {
    throw new Error(
      'No local Chrome found. Set PUPPETEER_EXECUTABLE_PATH or install Chrome.',
    );
  }

  return puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1920, height: 1358, deviceScaleFactor: 1 },
  });
}

function safeFilename(input: string): string {
  return input.replace(/[^\w.-]+/g, '_').slice(0, 80);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ catalogId: string }> },
) {
  const { catalogId } = await params;
  const catalog = await loadCatalog(catalogId);

  if (!catalog || catalog.meta.layoutType !== 'qx') {
    return new NextResponse('Catalog not found', { status: 404 });
  }

  const host = request.headers.get('host');
  if (!host) {
    return new NextResponse('Missing host header', { status: 400 });
  }
  const protocol = process.env.VERCEL === '1' ? 'https' : 'http';
  const printUrl = `${protocol}://${host}/catalog/${catalogId}/print?puppeteer=1`;

  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.goto(printUrl, {
      waitUntil: 'networkidle0',
      timeout: 45000,
    });

    // Videos render as black in Puppeteer (no autoplay in headless). Replace
    // each <video> with its poster image so the PDF shows the still frame.
    await page.evaluate(() => {
      document.querySelectorAll('video').forEach((video) => {
        const poster = video.poster;
        if (!poster) {
          video.style.display = 'none';
          return;
        }
        const img = document.createElement('img');
        img.src = poster;
        img.className = video.className;
        img.alt = '';
        img.setAttribute('loading', 'eager');
        video.replaceWith(img);
      });
    });

    // Headless Chrome never scrolls, so IntersectionObserver-driven things
    // (framer-motion useInView, next/image lazy loading) never fire. Scroll
    // end-to-end to trigger them all.
    await page.evaluate(async () => {
      const totalHeight = document.body.scrollHeight;
      const step = 500;
      for (let y = 0; y <= totalHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      window.scrollTo(0, 0);
    });

    // Force every <img> to eager-load and re-fetch any that are still pending,
    // then wait until all have either resolved or errored. This is the
    // belt-and-braces against any remaining lazy-load holdouts.
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      imgs.forEach((img) => {
        img.loading = 'eager';
        if (!img.complete && img.src) {
          const src = img.src;
          img.src = '';
          img.src = src;
        }
      });
      await Promise.all(
        imgs.map((img) =>
          img.complete && img.naturalWidth > 0
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
              }),
        ),
      );
    });

    // Final settle for paint + decode.
    await new Promise((resolve) => setTimeout(resolve, 500));


    // DEBUG: log dimensions of each .print-page so we can see why Chromium
    // is paginating into 2 PDF pages per DOM page.
    const pdfBytes = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      // Scale 1920×1358 DOM pages down to A4 landscape (~1123×794px @ 96dpi).
      // 1123/1920 = 0.585. Each DOM print-page now exactly fills one PDF page.
      scale: 0.585,
    });

    const baseName = catalog.meta.title || catalogId;
    const filename = `${safeFilename(baseName)}.pdf`;

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBytes.length),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=300, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('[pdf] generation failed', { catalogId, error });
    const message =
      error instanceof Error ? error.message : 'Unknown PDF error';
    return new NextResponse(`PDF generation failed: ${message}`, {
      status: 500,
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
