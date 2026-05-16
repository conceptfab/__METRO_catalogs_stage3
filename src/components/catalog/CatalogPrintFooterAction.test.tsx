import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CatalogPrintFooterAction from './CatalogPrintFooterAction';

describe('CatalogPrintFooterAction', () => {
  it('renders an accessible link to the catalog PDF download endpoint', () => {
    render(<CatalogPrintFooterAction catalogId="QX" />);
    const link = screen.getByRole('link', {
      name: /download or print this catalog/i,
    });
    expect(link).toHaveAttribute('href', '/api/catalog/QX/pdf');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('hides itself in print output via .print-hide class', () => {
    const { container } = render(<CatalogPrintFooterAction catalogId="QX" />);
    expect(container.firstChild).toHaveClass('print-hide');
  });

  it('shows visible "Download / Print" label', () => {
    render(<CatalogPrintFooterAction catalogId="QX" />);
    expect(screen.getByText(/download \/ print/i)).toBeInTheDocument();
  });
});
