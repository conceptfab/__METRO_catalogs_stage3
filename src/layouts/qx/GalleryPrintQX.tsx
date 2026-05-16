import type { CatalogData } from '@/types/catalog';
import { SectionHeading } from '@/components/catalog/SectionHeading';

interface Props {
  catalog: CatalogData;
}

/**
 * Print-only Gallery. Uses the shared .print-section / .print-section-frame
 * geometry so the page matches every other non-Hero section in the catalog.
 * SectionHeading at the top, image grid below — columns × rows from
 * gallery/print.json.
 */
export default function GalleryPrintQX({ catalog }: Props) {
  const { sectionLabel, title, images, print } = catalog.gallery;
  const config = print ?? {};
  const columns = config.columns ?? 3;
  const rows = config.rows ?? Math.ceil(images.length / columns);
  const gap = config.gap ?? 16;
  const showTitle = config.showTitle ?? true;
  const maxImages = config.maxImages ?? columns * rows;
  const items = images.slice(0, maxImages);

  return (
    <section
      id="gallery"
      className="print-section"
      aria-label={sectionLabel || 'Visual gallery'}
    >
      <div className="print-section-frame">
        {showTitle && (
          <SectionHeading
            id="gallery"
            sectionLabel={sectionLabel}
            title={title}
            className="print-section-heading"
          />
        )}

        <div className="print-section-content">
          <div
            className="gallery-print-grid"
            style={{
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              gap,
            }}
          >
            {items.map((img, i) => (
              <div key={`${img.src}-${i}`} className="gallery-print-cell">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="eager"
                  className="gallery-print-image"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
