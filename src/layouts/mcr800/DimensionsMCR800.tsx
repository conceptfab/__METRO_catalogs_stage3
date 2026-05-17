'use client';

import { useRef } from 'react';
import { m, useInView } from 'framer-motion';
import type { DimensionsData } from '@/types/catalog';
import { SECTION_REVEAL_LIFT, slowTransition } from '@/lib/motion';
import { QxText } from '@/components/catalog/QxText';

interface DimensionsSectionProps {
  data: DimensionsData;
}

const PLACEHOLDER_COUNT = 6;

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
        className="mx-auto w-full max-w-[1440px] px-5 pt-6 pb-12 sm:px-8 sm:pt-8 lg:px-12 lg:pt-16 lg:pb-20"
        ref={ref}
      >
        <m.div
          initial={reveal.header.initial}
          animate={isInView ? reveal.header.animate : {}}
          transition={slowTransition({ duration: 0.6 })}
          className="flex flex-col lg:max-w-[720px]"
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
        </m.div>

        <m.div
          initial={reveal.content.initial}
          animate={isInView ? reveal.content.animate : {}}
          transition={slowTransition({ duration: 0.6, delay: 0.2 })}
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:mt-14 lg:grid-cols-3 lg:gap-8"
        >
          {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
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
