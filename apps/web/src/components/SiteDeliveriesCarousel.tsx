import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  ShieldCheck,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import WhatsAppIcon from './icons/WhatsAppIcon';
import { COMPANY_INFO } from '../data/materialsData';

const DELIVERIES = [
  {
    id: 1,
    location: 'Noida Sector 128, Jaypee Greens',
    projectType: 'G+3 Independent Luxury Villa',
    material: '450 Bags UltraTech Super Weather Plus Cement',
    timing: 'Delivered 7:15 AM · Scheduled Morning Slab Pour',
    image: '/images/deliveries/cement-illustration.png',
    contractor: 'M/s Sharma & Sons (Civil Contractors)',
    feedback:
      '"Zero labor waiting time. The truck arrived at 7:15 AM before our mistri team reached the site."',
    tag: 'Morning Casting Slot',
  },
  {
    id: 2,
    location: 'Gurugram, Golf Course Extension Road',
    projectType: 'Commercial Basement & Raft Foundation',
    material: '14 Metric Tons Tata Tiscon 550D Rebars (12mm, 16mm, 20mm)',
    timing: 'Delivered 8:45 AM · Direct Crane Offloading',
    image: '/images/deliveries/steel-illustration.png',
    contractor: 'Apex Infrastructure Group',
    feedback:
      '"All bundles tagged with factory test certs. Direct crane unloading saved us 4 hours of manual labor."',
    tag: 'Heavy Structural Lot',
  },
  {
    id: 3,
    location: 'Greater Noida West, Sector 10',
    projectType: 'Residential Multi-Unit G+4',
    material: 'Astral CPVC Pro Pipes (1", 1.25") & Supreme SWR Drainage Rings',
    timing: 'Delivered Same-Day · 3:30 PM Express Dispatch',
    image: '/images/deliveries/plumbing-illustration.png',
    contractor: 'Elite Buildcon Projects',
    feedback:
      '"100% matched fittings with Astral solvent cement. No local substitution headache."',
    tag: 'Concealed Plumbing Lot',
  },
  {
    id: 4,
    location: 'South Delhi, Vasant Kunj Enclave',
    projectType: 'Designer Villa Renovation',
    material: 'Polycab FR-LSH Wires (1.5mm, 2.5mm, 4.0mm) + Havells LifeLine',
    timing: 'Delivered 11:00 AM · Factory Hologram Verified',
    image: '/images/deliveries/electrical-illustration.png',
    contractor: 'Greenfield Architects & Builders',
    feedback:
      '"Genuine batch verification with GST bill. Exactly what our electrical consultant specified."',
    tag: 'Fire-Safe Electrical Lot',
  },
];

export default function SiteDeliveriesCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  // Continuous auto-slide every 3.8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % DELIVERIES.length);
    }, 3800);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + DELIVERIES.length) % DELIVERIES.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % DELIVERIES.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  return (
    <section
      className="site-deliveries-carousel-section"
      aria-label="Recent Delhi NCR Deliveries Carousel"
    >
      <div className="container">
        {/* Section Title */}
        <div className="section-title-wrap text-center">
          <h2 className="section-title-clean">Recent Verified Site Deliveries</h2>
          <p className="section-subtitle-clean">
            Supplying active construction sites across Noida, Greater Noida, Delhi, Gurugram, and Ghaziabad.
          </p>
        </div>

        {/* Carousel Showcase Card with Sliding Track */}
        <div className="delivery-carousel-box">
          <div
            className="delivery-track-viewport"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="delivery-sliding-track"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {DELIVERIES.map((item) => (
                <div key={item.id} className="delivery-slide-card">
                  <div className="delivery-card-grid">
                    {/* Media Col */}
                    <div className="delivery-media-col">
                      <img
                        src={item.image}
                        alt={`Illustrative construction materials: ${item.tag}`}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = '/images/fleet_truck_delhi.jpg';
                        }}
                      />
                      <span className="delivery-image-note">Illustrative image</span>
                      <div className="delivery-tag-chip">
                        <span className="live-dot" /> {item.tag}
                      </div>
                    </div>

                    {/* Content Col */}
                    <div className="delivery-details-col">
                      <div className="delivery-header-meta">
                        <div className="loc-badge">
                          <MapPin size={15} />
                          <strong>{item.location}</strong>
                        </div>
                        <span className="timing-pill">
                          <Clock size={13} /> {item.timing}
                        </span>
                      </div>

                      <div className="delivery-scope-box">
                        <span className="scope-lbl">Project Scope:</span>
                        <h4 className="project-type-title">{item.projectType}</h4>
                        <p className="material-lot-desc">{item.material}</p>
                      </div>

                      <blockquote className="contractor-quote">
                        <p>{item.feedback}</p>
                        <cite>— {item.contractor}</cite>
                      </blockquote>

                      <div className="delivery-card-footer-action">
                        <div className="guarantee-check">
                          <CheckCircle2 size={16} />
                          <span>100% Genuine Materials Delivered with Original GST Bill</span>
                        </div>

                        <a
                          href={`https://wa.me/919773505015?text=${encodeURIComponent(
                            `Hello Material Square, I saw your recent delivery to ${item.location}. I need similar materials for my site:`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-whatsapp btn-sm"
                        >
                          <WhatsAppIcon size={16} color="#ffffff" />
                          <span>Book Delivery Slot</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              type="button"
              className="carousel-arrow-btn prev"
              onClick={handlePrev}
              aria-label="Previous Delivery"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className="carousel-arrow-btn next"
              onClick={handleNext}
              aria-label="Next Delivery"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {/* Dots Indicator (Hero Style Dots) */}
          <div className="delivery-carousel-dots">
            {DELIVERIES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`delivery-pill-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to delivery ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
