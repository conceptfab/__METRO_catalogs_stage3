'use client';

import { Fragment, useRef } from 'react';
import Image from 'next/image';
import { m, useInView } from 'framer-motion';
import type { DimensionsData } from '@/types/catalog';
import { SECTION_REVEAL_LIFT, slowTransition } from '@/lib/motion';
import { QxText } from '@/components/catalog/QxText';

interface DimensionsSectionProps {
  data: DimensionsData;
}

const PLACEHOLDER_COUNT = 6;

const MODULE_CODE_REGEX = /(RC\d{3}(?:FS|L|R)?)/g;

const renderLineWithBoldedCodes = (line: string) => {
  const parts = line.split(MODULE_CODE_REGEX);
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <strong key={idx} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      <Fragment key={idx}>{part}</Fragment>
    ),
  );
};

const DimensionsMCR800 = ({ data }: DimensionsSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const reveal = SECTION_REVEAL_LIFT;

  return (
    <section
      id="dimensions"
      className="bg-surface-elevated"
      aria-labelledby="dimensions-title"
    >
      <div
        className="relative mx-auto w-full max-w-[1440px] px-5 pt-6 pb-12 sm:px-8 sm:pt-8 lg:px-0 lg:py-0"
        ref={ref}
      >
        <m.div
          initial={reveal.header.initial}
          animate={isInView ? reveal.header.animate : {}}
          transition={slowTransition({ duration: 0.6 })}
          className="relative z-10 flex flex-col lg:max-w-[720px] lg:pt-3"
        >
          <p className="section_ID font-display uppercase">
            <QxText text={data.sectionLabel} />
          </p>
          <h2
            id="dimensions-title"
            className="section_Title mt-8 font-display font-normal lg:mt-7"
          >
            <QxText text={data.title} />
          </h2>
          {data.description && (
            <div className="sec_main_text mt-6 space-y-1">
              {data.description.split('\n').filter(Boolean).map((line, idx) => (
                <p key={idx}>{renderLineWithBoldedCodes(line)}</p>
              ))}
            </div>
          )}
        </m.div>

        <m.div
          initial={reveal.content.initial}
          animate={isInView ? reveal.content.animate : {}}
          transition={slowTransition({ duration: 0.6, delay: 0.2 })}
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:mt-14 lg:grid-cols-3 lg:gap-8"
        >
          {data.modules && data.modules.length > 0
            ? data.modules.map((module, idx) => (
                <div key={`${module.label}-${idx}`} className="flex flex-col items-center gap-3">
                  <div className="relative aspect-square w-[70%] overflow-hidden">
                    <Image
                      src={module.image}
                      alt={module.label}
                      fill
                      sizes="(min-width: 1024px) 23vw, (min-width: 640px) 35vw, 70vw"
                      className="object-contain"
                    />
                  </div>
                  <span className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-foreground">
                    {module.label}
                  </span>
                </div>
              ))
            : Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
                <div
                  key={i}
                  className="relative aspect-square w-full overflow-hidden border border-border bg-surface-elevated"
                  aria-hidden="true"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display text-xs uppercase tracking-[0.2em] text-neutral-500">
                      module placeholder
                    </span>
                  </div>
                </div>
              ))}
        </m.div>
      </div>
    </section>
  );
};

export default DimensionsMCR800;
