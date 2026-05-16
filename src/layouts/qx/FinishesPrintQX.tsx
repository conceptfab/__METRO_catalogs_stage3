import type {
  FinishesData,
  MaterialsConfiguratorData,
  MaterialsConfiguratorOption,
} from '@/types/catalog';
import { SectionHeading } from '@/components/catalog/SectionHeading';
import { QxText } from '@/components/catalog/QxText';

interface Props {
  data: FinishesData;
  configurator?: MaterialsConfiguratorData;
}

const EMPTY_OPTIONS: MaterialsConfiguratorOption[] = [];
const DESKTOP_PRICE_GROUP_1 = ['U100', 'U110', 'U120', 'U130', 'W200', 'W220'];
const DESKTOP_PRICE_GROUP_2 = ['W210', 'W240', 'W250', 'W310', 'W330'];
const FRAME_COLOR_ORDER = ['RAL9006', 'RAL9005', 'RAL9003', 'RAL7024'];

function orderOptions(
  options: MaterialsConfiguratorOption[],
  orderedCodes: string[],
) {
  const byCode = new Map(options.map((o) => [o.code, o]));
  return orderedCodes.flatMap((code) => {
    const option = byCode.get(code);
    return option ? [option] : [];
  });
}

function formatOptionCode(code: string) {
  return code.startsWith('RAL') ? `RAL ${code.slice(3)}` : code;
}

function getOptionLabelParts(option: MaterialsConfiguratorOption) {
  const code = formatOptionCode(option.code);
  const name = option.label.replace(code, '').replace(option.code, '').trim();
  return { code, name };
}

function StaticTile({ option }: { option: MaterialsConfiguratorOption }) {
  const label = getOptionLabelParts(option);
  return (
    <div className="finishes-print-tile">
      <div
        aria-hidden="true"
        className="finishes-print-tile-image"
        style={{ backgroundImage: `url("${option.thumbnail}")` }}
      />
      <p className="finishes-print-tile-label">
        <span className="block">
          <QxText text={label.code} />
        </span>
        {label.name && (
          <span className="block">
            <QxText text={label.name} />
          </span>
        )}
      </p>
    </div>
  );
}

function StaticGroup({
  title,
  options,
  variant = 'secondary',
}: {
  title: string;
  options: MaterialsConfiguratorOption[];
  variant?: 'primary' | 'secondary';
}) {
  if (options.length === 0) return null;
  const titleClass =
    variant === 'primary'
      ? 'mb-3 qx-emphasis-title'
      : 'mb-2 font-display text-lg font-normal text-foreground';
  return (
    <div>
      <h3 className={titleClass}>
        <QxText text={title} />
      </h3>
      <div className="finishes-print-tile-row">
        {options.map((option) => (
          <StaticTile key={option.id} option={option} />
        ))}
      </div>
    </div>
  );
}

/**
 * Print-only Finishes section. Static rendering — no tile selection,
 * no hover, no preview zoom, no motion. Visual structure mirrors
 * FinishesQX but uses the shared .print-section frame.
 */
export default function FinishesPrintQX({ data, configurator }: Props) {
  const sourceFrame = configurator?.frameOptions ?? EMPTY_OPTIONS;
  const sourceDesktop = configurator?.desktopOptions ?? EMPTY_OPTIONS;
  const frameOptions = orderOptions(sourceFrame, FRAME_COLOR_ORDER);
  const desktopGroup1 = orderOptions(sourceDesktop, DESKTOP_PRICE_GROUP_1);
  const desktopGroup2 = orderOptions(sourceDesktop, DESKTOP_PRICE_GROUP_2);
  const desktopOptions = [...desktopGroup1, ...desktopGroup2];
  const hasConfigurator = frameOptions.length > 0 && desktopOptions.length > 0;

  const previewOption = desktopOptions[0] ?? frameOptions[0];
  const previewImage = previewOption?.image ?? '';
  const previewAlt = previewOption?.label ?? data.title;

  const descriptionLines = data.description?.split('\n') ?? [];

  return (
    <section
      id="finishes"
      className="print-section"
      aria-labelledby="finishes-title"
    >
      <div className="print-section-frame">
        <SectionHeading
          id="finishes"
          sectionLabel={data.sectionLabel}
          title={data.title}
          className="print-section-heading"
        />

        <div className="print-section-content finishes-print-content">
          <div className="finishes-print-left">
            {data.description && (
              <p className="sec_main_text finishes-print-description">
                {descriptionLines.map((line, index) => (
                  <span key={line}>
                    <QxText text={line} />
                    {index < descriptionLines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            )}

            {hasConfigurator ? (
              <div className="finishes-print-groups">
                <div>
                  <h3 className="mb-3 qx-emphasis-title">
                    <QxText text="Desktop Finish" />
                  </h3>
                  <div className="finishes-print-subgroups">
                    <StaticGroup
                      title="I-st price group"
                      options={desktopGroup1}
                    />
                    <StaticGroup
                      title="II-nd price group"
                      options={desktopGroup2}
                    />
                  </div>
                </div>
                <StaticGroup
                  title="Steel parts colors"
                  options={frameOptions}
                  variant="primary"
                />
              </div>
            ) : (
              <div className="finishes-print-groups">
                <div>
                  <h3 className="mb-4 qx-emphasis-title">Desktop Finish</h3>
                  <div className="finishes-print-swatch-row">
                    {data.desktopColors.map((c) => (
                      <div
                        key={c.name}
                        className="finishes-print-swatch"
                        style={{ backgroundColor: c.code }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-4 qx-emphasis-title">Frame Colour</h3>
                  <div className="finishes-print-swatch-row">
                    {data.frameColors.map((c) => (
                      <div
                        key={c.name}
                        className="finishes-print-swatch"
                        style={{ backgroundColor: c.code }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {previewImage && (
            <div className="finishes-print-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt={previewAlt}
                loading="eager"
                className="finishes-print-preview-image"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
