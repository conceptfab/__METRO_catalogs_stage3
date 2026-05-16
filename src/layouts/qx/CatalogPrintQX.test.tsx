import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CatalogPrintQX from './CatalogPrintQX';
import type { CatalogData } from '@/types/catalog';

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt?: string; src: string }) => (
    <img alt={alt ?? ''} src={typeof src === 'string' ? src : ''} />
  ),
}));

const minimalCatalog: CatalogData = {
  id: 'QX0',
  meta: {
    title: 'Test',
    description: '',
    collectionName: 'Test Collection',
    layoutType: 'qx',
    theme: undefined,
    brandName: 'METRO',
  },
  sections: [],
  hero: {
    brandLabel: 'METRO',
    collectionName: 'Test Collection',
    tagline: 'Test tagline',
    ctaLabel: 'Explore',
    heroImage: '/x.webp',
    heroImageAlt: '',
  },
  overview: {
    sectionLabel: 'Overview',
    title: 'Overview',
    paragraphs: [],
    packshotImage: '/x.webp',
    packshotImageAlt: '',
    packshotCaption: '',
  },
  gallery: {
    sectionLabel: 'Gallery',
    title: 'Gallery',
    images: [],
  },
  finishes: {
    sectionLabel: 'Finishes',
    title: 'Finishes',
    desktopColors: [],
    frameColors: [],
    sizes: [],
    comparisonTable: [],
    configurator: undefined,
  },
  dimensions: {
    sectionLabel: 'Dimensions',
    title: 'Dimensions',
    specs: [],
    certifications: [],
  },
  materials: {
    sectionLabel: 'Materials',
    title: 'Materials',
    materials: [],
    swatches: [],
    configurator: undefined,
  },
  features: {
    sectionLabel: 'Features',
    title: 'Features',
    items: [],
  },
  gettingStarted: {
    sectionLabel: 'Getting Started',
    title: 'Getting Started',
    steps: [],
    ctaLabels: { quote: 'Get a Quote', pdf: 'Download PDF', contact: 'Contact' },
    footerText: '',
    versionInfo: '',
  },
  productCodes: {
    sectionLabel: 'Codes',
    title: 'Product Codes',
    description: '',
    groups: [],
  },
  packshots: undefined,
};

describe('CatalogPrintQX', () => {
  it('wraps every section in a .print-page container', () => {
    const { container } = render(<CatalogPrintQX catalog={minimalCatalog} />);
    const pages = container.querySelectorAll('.print-page');
    // Hero, Overview, Gallery, Finishes, Dimensions, Materials, Features, GettingStarted, ProductCodes = 9
    // Packshots is undefined → not rendered. Expected: 9 print pages.
    expect(pages.length).toBe(9);
  });

  it('renders no navigation or footer (print layout only)', () => {
    const { queryByRole } = render(<CatalogPrintQX catalog={minimalCatalog} />);
    expect(queryByRole('navigation')).toBeNull();
    expect(queryByRole('contentinfo')).toBeNull();
  });
});
