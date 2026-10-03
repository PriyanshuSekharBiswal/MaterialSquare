import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';

const MATERIAL_GROUPS = [
  {
    id: 'cement',
    title: 'Structure & foundation',
    materials: 'Cement, reinforcement steel and aggregates',
    note: 'Example material group. Confirm grades, quantities, availability and delivery with staff.',
    image: '/images/categories/cement-category.jpg',
    category: 'cement',
  },
  {
    id: 'pipes',
    title: 'Plumbing & drainage',
    materials: 'Water pipes, drainage pipes and compatible fittings',
    note: 'Choose the required system and size; staff can help confirm compatible items.',
    image: '/images/categories/pipes-category.jpg',
    category: 'pipes',
  },
  {
    id: 'electrical',
    title: 'Electrical work',
    materials: 'Wires, cables, switches and installation accessories',
    note: 'Confirm the specification and suitability with a qualified electrician.',
    image: '/images/categories/wires-category.jpg',
    category: 'wires',
  },
  {
    id: 'finishes',
    title: 'Finishing work',
    materials: 'Paints, wall finishes, sanitaryware and bath fittings',
    note: 'Final colour, model, pack size, price and availability are confirmed by staff.',
    image: '/images/categories/sanitary-category.jpg',
    category: 'all',
  },
];

export default function SiteDeliveriesCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % MATERIAL_GROUPS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const move = (step: number) => {
    setCurrentIndex((prev) => (prev + step + MATERIAL_GROUPS.length) % MATERIAL_GROUPS.length);
  };
  const selected = MATERIAL_GROUPS[currentIndex];

  return (
    <section className="site-deliveries-carousel-section" aria-label="Common construction material groups">
      <div className="container">
        <div className="section-title-wrap text-center">
          <h2 className="section-title-clean">Materials for Every Project Stage</h2>
          <p className="section-subtitle-clean">
            Explore common material groups. Product listings and current availability are confirmed in the marketplace.
          </p>
        </div>

        <div className="delivery-carousel-box">
          <div className="delivery-track-viewport">
            <div className="delivery-sliding-track" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
              {MATERIAL_GROUPS.map((item) => (
                <div key={item.id} className="delivery-slide-card">
                  <div className="delivery-card-grid">
                    <div className="delivery-media-col">
                      <img src={item.image} alt={`Illustration of ${item.title.toLowerCase()} materials`} loading="lazy" />
                      <span className="delivery-image-note">Illustrative image</span>
                      <div className="delivery-tag-chip"><Layers size={14} /> {item.title}</div>
                    </div>
                    <div className="delivery-details-col">
                      <div className="delivery-header-meta">
                        <div className="loc-badge"><Layers size={15} /><strong>Common material group</strong></div>
                      </div>
                      <div className="delivery-scope-box">
                        <span className="scope-lbl">Examples of product types</span>
                        <h3 className="project-type-title">{item.title}</h3>
                        <p className="material-lot-desc">{item.materials}</p>
                      </div>
                      <p className="delivery-editorial-note">{item.note}</p>
                      <div className="delivery-card-footer-action">
                        <span className="delivery-confirmation-note">Review listed products, units and prices with the Material Square team.</span>
                        <Link className="btn btn-primary btn-sm" to={`/marketplace?category=${item.category}`}>
                          Browse materials
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="carousel-arrow-btn prev" onClick={() => move(-1)} aria-label="Previous material group">
              <ChevronLeft size={22} />
            </button>
            <button type="button" className="carousel-arrow-btn next" onClick={() => move(1)} aria-label="Next material group">
              <ChevronRight size={22} />
            </button>
          </div>
          <div className="delivery-carousel-dots">
            {MATERIAL_GROUPS.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`delivery-pill-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Show ${item.title}`}
                aria-current={idx === currentIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
