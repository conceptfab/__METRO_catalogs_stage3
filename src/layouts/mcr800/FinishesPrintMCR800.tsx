import type { FinishesData } from '@/types/catalog';
import { SectionHeading } from '@/components/catalog/SectionHeading';
import { QxText } from '@/components/catalog/QxText';

interface MCR800Illustration {
  id: string;
  color: 'white' | 'black';
  label: string;
  image?: string;
  alt: string;
}

interface MCR800FinishesData extends FinishesData {
  illustrations?: MCR800Illustration[];
}

interface Props {
  data: FinishesData;
}

/**
 * Print-only Finishes section for MCR800.
 *
 * Mirrors the on-screen MCR800 Finishes section: heading + description on top,
 * the two detail illustrations from /finishes/ as side-by-side large squares
 * below. No materials configurator preview, no swatch tiles — this catalog
 * only ships two finish variants (White and Black) and has no configurable
 * frame/desktop combinations.
 */
export default function FinishesPrintMCR800({ data }: Props) {
  const extended = data as MCR800FinishesData;
  const illustrations = extended.illustrations ?? [];
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

        <div className="print-section-content finishes-print-content-mcr800">
          {data.description && (
            <p className="sec_main_text finishes-print-description">
              {descriptionLines.map((line, index) => (
                <span key={`${line}-${index}`}>
                  <QxText text={line} />
                  {index < descriptionLines.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          )}

          {illustrations.length > 0 && (
            <div className="finishes-print-grid-mcr800">
              {illustrations.map((slot) => (
                <figure
                  key={slot.id}
                  className="finishes-print-figure-mcr800"
                >
                  {slot.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slot.image}
                      alt={slot.alt}
                      loading="eager"
                      className="finishes-print-figure-image-mcr800"
                    />
                  )}
                  <figcaption className="finishes-print-figure-caption-mcr800">
                    <QxText text={slot.label} />
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
