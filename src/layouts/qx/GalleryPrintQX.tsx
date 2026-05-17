import type { CatalogData } from '@/types/catalog';
import { SectionHeading } from '@/components/catalog/SectionHeading';

interface Props {
  catalog: CatalogData;
}

/**
 * Print-only Gallery. Justified-row layout: rows share equal height, each cell
 * inside a row flex-grows by the image's aspect ratio so wide and tall images
 * occupy proportionally different widths but render at the same row height.
 * `columns` from gallery/print.json controls items per row.
 */
export default function GalleryPrintQX({ catalog }: Props) {
  const { sectionLabel, title, images, print } = catalog.gallery;
  const config = print ?? {};
  const perRow = config.columns ?? 3;
  const gap = config.gap ?? 16;
  const showTitle = config.showTitle ?? true;
  const maxImages =
    config.maxImages ?? (config.rows ? perRow * config.rows : images.length);
  const items = images.slice(0, maxImages);

  const rows: typeof items[] = [];
  for (let i = 0; i < items.length; i += perRow) {
    rows.push(items.slice(i, i + perRow));
  }

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
          <div className="gallery-print-rows" style={{ gap }}>
            {rows.map((row, ri) => (
              <div key={ri} className="gallery-print-row" style={{ gap }}>
                {row.map((img, i) => {
                  const aspect =
                    img.width && img.height ? img.width / img.height : 1;
                  return (
                    <div
                      key={`${img.src}-${i}`}
                      className="gallery-print-cell"
                      style={{ flex: `${aspect} 1 0` }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.src}
                        alt={img.alt}
                        loading="eager"
                        className="gallery-print-image"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
