import type {
  MaterialsConfiguratorData,
  MaterialsConfiguratorOption,
  PackshotsData,
} from '@/types/catalog';
import { SectionHeading } from '@/components/catalog/SectionHeading';
import { QxText } from '@/components/catalog/QxText';

interface Props {
  data: PackshotsData;
  materialsConfigurator?: MaterialsConfiguratorData;
}

const ITEMS_PER_PAGE = 4;

const SAMPLE_PACKSHOT_SRC =
  '/catalogs/QX/packshots/V51_W240_black__Shot_A_4K_R10.webp';

const FRAME_COLOR_FROM_NAME: Record<string, string> = {
  white: 'RAL9003',
  black: 'RAL9005',
  grey: 'RAL9006',
  gray: 'RAL9006',
};

const METRO_ID_PATTERN = /^metro[_ -]/i;

// === Helpers copied verbatim from PackshotsQX so print is self-contained
//     and does not require any export changes to the on-screen component. ===
function parsePackshotImage(filename: string | undefined): {
  topCode?: string;
  frameCode?: string;
} {
  if (!filename) return {};
  const base = filename.split('/').pop() ?? '';
  const stem = base.replace(/\.[^.]+$/, '').split('__')[0];
  const tokens = stem.split('_');
  const topToken = tokens[1];
  const frameToken = tokens[2];
  const topCode =
    topToken && /^[UW]\d+$/i.test(topToken)
      ? topToken.toUpperCase()
      : undefined;

  let frameCode: string | undefined;
  if (frameToken) {
    if (/^RAL\d+$/i.test(frameToken)) {
      frameCode = frameToken.toUpperCase();
    } else {
      frameCode = FRAME_COLOR_FROM_NAME[frameToken.toLowerCase()];
    }
  }
  return { topCode, frameCode };
}

function pickOption(
  options: MaterialsConfiguratorOption[] | undefined,
  code: string | undefined,
): MaterialsConfiguratorOption | undefined {
  if (!options || !code) return undefined;
  const upper = code.toUpperCase();
  const matches = options.filter(
    (option) => option.code.toUpperCase() === upper,
  );
  if (matches.length === 0) return undefined;

  const metroEntry = matches.find((option) => METRO_ID_PATTERN.test(option.id));
  const swatchEntry = matches.find(
    (option) => !METRO_ID_PATTERN.test(option.id),
  );

  if (metroEntry && swatchEntry) {
    return {
      ...metroEntry,
      label: swatchEntry.label,
      thumbnail: swatchEntry.image,
    };
  }
  return swatchEntry ?? metroEntry ?? matches[0];
}

function formatOptionCode(code: string) {
  return code.startsWith('RAL') ? `RAL ${code.slice(3)}` : code;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

interface FlatItem {
  code: string;
  name: string;
  image: string;
  groupLabel: string;
}

function StaticChip({
  option,
  role,
}: {
  option: MaterialsConfiguratorOption;
  role: 'Frame' | 'Top';
}) {
  const codeFormatted = formatOptionCode(option.code);
  return (
    <span className="packshots-print-chip">
      <span className="packshots-print-chip-role">{role}</span>
      <span
        className="packshots-print-chip-swatch"
        aria-hidden="true"
        style={{ backgroundImage: `url("${option.thumbnail}")` }}
      />
      <span className="packshots-print-chip-code">{codeFormatted}</span>
    </span>
  );
}

/**
 * Print-only Packshots/Models section.
 *
 * Counts catalog items and emits ceil(N / 4) print pages with a 2×2 grid
 * on each. Self-contained: no clicks, no lightbox, no motion. Renders its
 * own outer .print-page wrappers (CatalogPrintQX skips its own wrapper for
 * this component).
 */
export default function PackshotsPrintQX({
  data,
  materialsConfigurator,
}: Props) {
  const allItems: FlatItem[] = data.groups.flatMap((group) =>
    group.items.map((item) => ({
      code: item.code,
      name: item.name,
      image: item.image ?? SAMPLE_PACKSHOT_SRC,
      groupLabel: group.label,
    })),
  );

  if (allItems.length === 0) return null;

  const pages = chunk(allItems, ITEMS_PER_PAGE);

  return (
    <>
      {pages.map((pageItems, pageIndex) => (
        <div
          key={`packshots-page-${pageIndex}`}
          className="print-page print-page-packshots"
        >
          <section
            id={pageIndex === 0 ? 'packshots' : undefined}
            className="print-section"
            aria-labelledby={
              pageIndex === 0 ? 'packshots-title' : undefined
            }
          >
            <div className="print-section-frame">
              <SectionHeading
                id="packshots"
                sectionLabel={data.sectionLabel}
                title={data.title}
                className="print-section-heading"
              />
              {data.subtitle && (
                <p className="packshots-print-subtitle sec_main_text">
                  <QxText text={data.subtitle} />
                </p>
              )}

              <div className="print-section-content">
                <div className="packshots-print-grid">
                  {pageItems.map((item) => {
                    const { topCode, frameCode } = parsePackshotImage(
                      item.image,
                    );
                    const frameOption = pickOption(
                      materialsConfigurator?.frameOptions,
                      frameCode,
                    );
                    const desktopOption = pickOption(
                      materialsConfigurator?.desktopOptions,
                      topCode,
                    );
                    return (
                      <article
                        key={`${item.code}-${item.image}`}
                        className="packshots-print-cell"
                      >
                        <div className="packshots-print-image-wrap">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image}
                            alt={item.name || `${item.code} packshot`}
                            loading="eager"
                            className="packshots-print-image"
                          />
                        </div>
                        <div className="packshots-print-meta">
                          <span className="packshots-print-code">
                            <QxText text={item.code} />
                          </span>
                          {frameCode && frameOption && (
                            <StaticChip option={frameOption} role="Frame" />
                          )}
                          {topCode && desktopOption && (
                            <StaticChip option={desktopOption} role="Top" />
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      ))}
    </>
  );
}
