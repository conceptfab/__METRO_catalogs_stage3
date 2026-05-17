import { SectionHeading } from '@/components/catalog/SectionHeading';

/**
 * Print-only Contact section. Shared between all catalogs in the PDF
 * output — content does not depend on the per-catalog data, so it lives
 * inline here as the single source of truth. Placeholder values to be
 * replaced with the final METRO contact details.
 */
const CONTACT = {
  company: 'METRO',
  tagline: 'Office furniture · Made in Europe',
  address: {
    line1: 'ul. Przykładowa 12',
    line2: '00-000 Warszawa, Poland',
  },
  phone: '+48 00 000 00 00',
  email: 'hello@metro.example',
  website: 'metro.example',
};

interface ContactBlockProps {
  label: string;
  children: React.ReactNode;
}

function ContactBlock({ label, children }: ContactBlockProps) {
  return (
    <div className="contact-print-block">
      <p className="contact-print-block-label">{label}</p>
      <div className="contact-print-block-value">{children}</div>
    </div>
  );
}

export default function ContactPrintMCR800() {
  return (
    <div className="print-page print-page-contact">
      <section
        id="contact"
        className="print-section"
        aria-labelledby="contact-title"
      >
        <div className="print-section-frame">
          <SectionHeading
            id="contact"
            sectionLabel="Contact"
            title="Get in touch"
            className="print-section-heading"
          />

          <div className="print-section-content contact-print-content">
            <div className="contact-print-company">
              <p className="contact-print-company-name">{CONTACT.company}</p>
              <p className="contact-print-company-tagline">{CONTACT.tagline}</p>
            </div>

            <div className="contact-print-grid">
              <ContactBlock label="Address">
                <p>{CONTACT.address.line1}</p>
                <p>{CONTACT.address.line2}</p>
              </ContactBlock>

              <ContactBlock label="Phone">
                <p>{CONTACT.phone}</p>
              </ContactBlock>

              <ContactBlock label="Email">
                <p>{CONTACT.email}</p>
              </ContactBlock>

              <ContactBlock label="Web">
                <p>{CONTACT.website}</p>
              </ContactBlock>
            </div>

            <p className="contact-print-note">
              For pricing, lead times, and tailored configurations please
              contact us using the channels above or visit our showroom by
              appointment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
