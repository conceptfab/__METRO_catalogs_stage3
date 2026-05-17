import type { FeatureItem, FeaturesData } from '@/types/catalog';
import { getIcon } from '@/lib/icon-map';
import { SectionHeading } from '@/components/catalog/SectionHeading';
import { QxText } from '@/components/catalog/QxText';

interface Props {
  data: FeaturesData;
}

const ITEMS_PER_PAGE = 3;

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Resolve the still image (last video frame) for a feature.
 *
 * Convention: alongside each `*.mp4` there is a pre-generated `*_last.webp`
 * extracted via ffmpeg (see scripts / catalog README). If the feature has a
 * `poster`, that takes precedence; otherwise we swap the extension.
 */
function resolveStillImage(item: FeatureItem): string | undefined {
  if (item.video?.poster) return item.video.poster;
  if (item.video?.src) {
    return item.video.src.replace(/\.(mp4|webm|mov)$/i, '_last.webp');
  }
  return undefined;
}

function FeatureCard({ item }: { item: FeatureItem }) {
  const Icon = getIcon(item.icon);
  const still = resolveStillImage(item);

  return (
    <article className="features-print-card">
      <div className="features-print-image-wrap">
        {still ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={still}
            alt={item.title}
            loading="eager"
            className="features-print-image"
          />
        ) : null}
      </div>

      <div className="features-print-button">
        <Icon
          size={24}
          strokeWidth={1.5}
          className="features-print-button-icon"
          aria-hidden="true"
        />
        <span className="features-print-button-title">
          <QxText text={item.title} />
        </span>
      </div>

      <p className="features-print-desc">
        <QxText text={item.desc} />
      </p>
    </article>
  );
}

/**
 * Print-only Features section. Static rendering — no video playback, no
 * animation, no tabs. The last frame of each video is used as a still image
 * (pre-generated `*_last.webp` next to the MP4).
 *
 * Layout: up to 3 features per page, 3 columns side-by-side. Catalogs with
 * more than 3 features get additional pages emitted by this component itself.
 */
export default function FeaturesPrintMCR800({ data }: Props) {
  if (!data.items || data.items.length === 0) return null;

  const pages = chunk(data.items, ITEMS_PER_PAGE);

  return (
    <>
      {pages.map((pageItems, pageIndex) => (
        <div
          key={`features-page-${pageIndex}`}
          className="print-page print-page-features"
        >
          <section
            id={pageIndex === 0 ? 'features' : undefined}
            className="print-section"
            aria-labelledby={pageIndex === 0 ? 'features-title' : undefined}
          >
            <div className="print-section-frame">
              <SectionHeading
                id="features"
                sectionLabel={data.sectionLabel}
                title={data.title}
                className="print-section-heading"
              />

              <div className="print-section-content">
                <div className="features-print-grid">
                  {pageItems.map((item) => (
                    <FeatureCard key={item.title} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      ))}
    </>
  );
}
