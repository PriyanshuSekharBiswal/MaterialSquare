import FaqSection from "../components/FaqSection";
import RequestContactForm from '../components/RequestContactForm';
import { whatsappLink } from '../messages';
import { Mail, MapPin, Phone } from 'lucide-react';
import WhatsAppIcon from '../components/icons/WhatsAppIcon';
import { useSiteContent } from '../site-content';
import DeferredDirectionGoogleMaps from "../components/DeferredDirectionGoogleMaps";

export default function ContactPage() {
  const siteContent = useSiteContent();
  const hasContactOptions = Boolean(
    siteContent["contact.phone"] ||
    siteContent["contact.email"] ||
    siteContent["contact.officeAddress"],
  );
  return (
    <div className="contact-page">
      <section className="page-hero-header">
        <div className="container">
          <div className="page-hero-content">
            <span className="badge-pill badge-orange-pill">Contact Material Square</span>
            <h1 className="page-title">{siteContent["contact.title"]}</h1>
            <p className="page-subtitle">
              {siteContent["contact.description"]}
            </p>
          </div>
        </div>
      </section>

      {hasContactOptions && <section className="contact-channels-section">
        <div className="container">
          <div className="contact-cards-grid">
            {siteContent["contact.phone"] && <>
            <article className="contact-info-card highlighted">
              <div className="info-card-icon whatsapp"><WhatsAppIcon size={26} color="#16a34a" /></div>
              <h2>WhatsApp</h2>
              <p>Send a material request or ask the team to confirm product and delivery details.</p>
              <a href={whatsappLink('Material Square — Contact Enquiry\n\nHello, I would like to discuss construction materials for my site.', siteContent["contact.phone"])} target="_blank" rel="noopener noreferrer" className="channel-link">
                Chat on WhatsApp
              </a>
            </article>

            <article className="contact-info-card">
              <div className="info-card-icon phone"><Phone size={24} /></div>
              <h2>Call</h2>
              <p>Speak with the team about a product listing or site requirement.</p>
              {siteContent["contact.phone"] && <a href={`tel:${siteContent["contact.phone"]}`} className="channel-link">{siteContent["contact.phoneDisplay"] || siteContent["contact.phone"]}</a>}
            </article>
            </>}

            {siteContent["contact.email"] && <article className="contact-info-card">
              <div className="info-card-icon insta"><Mail size={24} /></div>
              <h2>Email</h2>
              <p>Send your requirements and include supporting files from your email app.</p>
              <a href={`mailto:${siteContent["contact.email"]}`} className="channel-link">{siteContent["contact.email"]}</a>
            </article>}

            {siteContent["contact.officeAddress"] && <article className="contact-info-card highlighted">
              <div className="info-card-icon depot"><MapPin size={24} /></div>
              <h2>Office</h2>
              <p>Contact the team before visiting so they can confirm the right location and availability.</p>
              <span className="depot-address">{siteContent["contact.officeAddress"]}</span>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteContent["contact.officeAddress"])}`} target="_blank" rel="noopener noreferrer" className="channel-link">
                Open in Google Maps ↗
              </a>
            </article>}
          </div>
        </div>
      </section>}

      <DeferredDirectionGoogleMaps />

      <section className="contact-form-section">
        <div className="container">
          <div className="contact-form-layout">
            <div className="form-info-col">
              <span className="badge-pill badge-orange-pill">Prepare a message</span>
              <h2>Include the details the team needs.</h2>
              <p>
                Add your contact details, site location, materials, quantities, and preferred timing. The site prepares a message for you to review and send; it does not send it automatically.
              </p>
            </div>
            <div className="form-box-col">
              <div className="inquiry-form-card reveal-card"><RequestContactForm enquiry /></div>
            </div>
          </div>
        </div>
      </section>
      <FaqSection/>
    </div>
  );
}
