import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from './page';

type MockImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
};

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    priority: _priority,
    src,
    ...props
  }: MockImageProps) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ''} src={String(src)} {...props} />
  ),
}));

const catalog = (id: string) => ({
  id,
  meta: {
    title: `METRO ${id}`,
    brandName: `METRO ${id}`,
    collectionName: id,
    description: `${id} catalog`,
    layoutType: id === 'MCR800' ? 'mcr800' : 'qx',
  },
});

vi.mock('@/lib/catalog-loader', () => ({
  getCatalogList: vi.fn(async () =>
    ['QX', 'QS', 'VR', 'TS', 'FM', 'FOTA', 'MCR800'].map(catalog),
  ),
  getGlobalConfig: vi.fn(async () => ({
    brandName: 'METRO',
    siteTitle: 'METRO',
    siteSubtitle: 'Catalogs',
    footerText: 'CONCEPT / CREATION / PRODUCTION BY',
    catalogListTitle: 'Available catalogs',
  })),
}));

describe('HomePage catalog thumbnails', () => {
  it('uses a mobile thumbs image when the catalog provides one', async () => {
    const { container } = render(await HomePage());

    const mobileSources = [
      ...container.querySelectorAll('source[media="(max-width: 639px)"]'),
    ].map((source) => source.getAttribute('srcSet'));

    expect(mobileSources).toContain(
      '/catalogs/QX/thumbs/qx-home-mobile.webp',
    );
    expect(mobileSources).toContain(
      '/catalogs/MCR800/thumbs/mcr800-home-mobile.webp',
    );
  });
});
