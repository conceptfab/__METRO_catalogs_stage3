import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PdfDownloadButton from './PdfDownloadButton';

describe('PdfDownloadButton', () => {
  it('renders an accessible link to the catalog PDF download endpoint', () => {
    render(<PdfDownloadButton catalogId="QX0" />);
    const link = screen.getByRole('link', { name: /download pdf/i });
    expect(link).toHaveAttribute('href', '/api/catalog/QX0/pdf');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('is hidden in print output via .print-hide class', () => {
    render(<PdfDownloadButton catalogId="QX0" />);
    const link = screen.getByRole('link', { name: /download pdf/i });
    expect(link.className).toMatch(/print-hide/);
  });
});
