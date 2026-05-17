'use client';

import { useRef } from 'react';
import { m, useInView } from 'framer-motion';
import Image from 'next/image';
import type { MaterialsData } from '@/types/catalog';
import { SECTION_REVEAL_SETTLE, slowTransition } from '@/lib/motion';
import { QxText } from '@/components/catalog/QxText';
import { responsiveImg } from '@/lib/responsive-image';

interface MCR800Illustration {
  id: string;
  model: string;
  frameName: string;
  frameHex: string;
  image: string;
  alt: string;
}

interface MCR800MaterialsData extends MaterialsData {
  illustrations?: MCR800Illustration[];
}

interface MaterialsSectionProps {
  data: MaterialsData;
}

const FALLBACK_ILLUSTRATIONS: MCR800Illustration[] = [
  {
    id: 'set-1-white',
    model: 'Set 1',
    frameName: 'White',
    frameHex: '#f2f0ec',
    image: '/catalogs/MCR800/set/MCR_Set 1_white_wg__Shot_A__4K_R8.webp',
    alt: 'MCR800 Set 1 in white finish',
  },
  {
    id: 'set-2-white',
    model: 'Set 2',
    frameName: 'White',
    frameHex: '#f2f0ec',
    image: '/catalogs/MCR800/set/MCR_Set 2_white_wg__Shot_A__4K_R8.webp',
    alt: 'MCR800 Set 2 in white finish',
  },
  {
    id: 'set-3-black',
    model: 'Set 3',
    frameName: 'Black',
    frameHex: '#1a1a1a',
    image: '/catalogs/MCR800/set/MCR_Set 3_black_gb__Shot_A__4K_R8.webp',
    alt: 'MCR800 Set 3 in black finish',
  },
  {
    id: 'set-4-black',
    model: 'Set 4',
    frameName: 'Black',
    frameHex: '#1a1a1a',
    image: '/catalogs/MCR800/set/MCR_Set 4_black_gb__Shot_A__4K_R8.webp',
    alt: 'MCR800 Set 4 in black finish',
  },
];

const MaterialsMCR800 = ({ data }: MaterialsSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const reveal = SECTION_REVEAL_SETTLE;

  const extended = data as MCR800MaterialsData;
  const illustrations =
    extended.illustrations && extended.illustrations.length > 0
      ? extended.illustrations
      : FALLBACK_ILLUSTRATIONS;

  return (
    <section
      id="materials"
      aria-labelledby="materials-title"
      className="bg-surface-elevated"
    >
      <div
        className="relative mx-auto w-full max-w-[1440px] px-5 pt-6 pb-12 sm:px-8 sm:pt-8 lg:px-0 lg:pt-3 lg:pb-[120px]"
        ref={ref}
      >
        <m.div
          initial={reveal.header.initial}
          animate={isInView ? reveal.header.animate : {}}
          transition={slowTransition({ duration: 0.6 })}
          className="relative z-10 flex flex-col lg:max-w-[520px]"
        >
          <p className="section_ID font-display uppercase">
            <QxText text={data.sectionLabel} />
          </p>
          <h2
            id="materials-title"
            className="section_Title mt-8 font-display font-normal lg:mt-7"
          >
            <QxText text={data.title} />
          </h2>
          {data.description && (
            <p className="sec_main_text mt-6 max-w-[633px] font-body">
              <QxText text={data.description} />
            </p>
          )}
        </m.div>

        <div className="mt-12 -mx-5 grid grid-cols-1 gap-6 sm:mx-0 sm:grid-cols-2 lg:mt-[120px]">
          {illustrations.map((slot, i) => (
            <m.article
              key={slot.id}
              initial={reveal.content.initial}
              animate={isInView ? reveal.content.animate : {}}
              transition={slowTransition({
                duration: 0.5,
                delay: 0.2 + i * 0.1,
              })}
              className="min-w-0"
            >
              <div className="qx-packshot-desktop-frame">
                <Image
                  src={slot.image}
                  {...responsiveImg(slot.image, 'packshot')}
                  alt={slot.alt}
                  fill
                  sizes="(min-width: 1440px) 710px, (min-width: 640px) 46vw, 100vw"
                  className="qx-packshot-desktop-image"
                />
              </div>
              <div className="qx-packshot-meta">
                <span className="qx-packshot-code">{slot.model}</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-display text-[10px] uppercase tracking-[0.12em] text-foreground/70">
                    Frame
                  </span>
                  <span
                    aria-label={`Frame: ${slot.frameName}`}
                    className="inline-block size-6 border border-border"
                    style={{ backgroundColor: slot.frameHex }}
                  />
                </span>
              </div>
            </m.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MaterialsMCR800;
