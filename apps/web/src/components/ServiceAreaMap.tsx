import { ArrowUpRight, MapPin } from "lucide-react";
import { useSiteContent } from "../site-content";

const DEFAULT_SERVICE_AREA =
  "Noida, Greater Noida, Delhi, Gurugram, Ghaziabad and Faridabad";

export default function ServiceAreaMap({ compact = false }: { compact?: boolean }) {
  const siteContent = useSiteContent();
  const serviceArea = siteContent["contact.location"] || DEFAULT_SERVICE_AREA;
  const mapQuery = siteContent["contact.officeAddress"] || serviceArea;
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;

  return (
    <section className={`service-area-map-section${compact ? " is-compact" : ""}`}>
      <div className="container service-area-map-layout">
        <div className="service-area-map-copy">
          <span className="badge-pill badge-orange-pill">
            <MapPin size={14} /> Service area
          </span>
          <h2>{compact ? "Materials delivered across Delhi NCR." : siteContent["contact.coverageTitle"]}</h2>
          <p>
            {compact
              ? "Request site delivery across the listed service area. Our team confirms availability for each address."
              : siteContent["contact.coverageDescription"]}
          </p>
          <div className="service-area-map-coverage">
            <span className="service-area-pulse" aria-hidden="true" />
            <span>{serviceArea}</span>
          </div>
          {siteContent["contact.officeAddress"] && (
            <a
              className="service-area-map-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteContent["contact.officeAddress"])}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open office location in Maps <ArrowUpRight size={15} />
            </a>
          )}
        </div>
        <div className="service-area-map-frame">
          <iframe
            title="Map of the Material Square service area"
            src={mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <div className="service-area-map-caption">
            <span className="service-area-pulse" aria-hidden="true" />
            Coverage and delivery timing are confirmed for each site request
          </div>
        </div>
      </div>
    </section>
  );
}
