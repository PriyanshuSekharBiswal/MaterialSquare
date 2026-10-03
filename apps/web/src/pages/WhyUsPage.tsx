import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, Search, MessageCircle, BadgeIndianRupee, UserRoundCheck } from 'lucide-react';

const V1_FEATURES = [
  {
    icon: Search,
    title: 'Browse before signing in',
    description: 'Explore the catalogue and published product details without creating an account.',
  },
  {
    icon: ClipboardList,
    title: 'Keep a material list',
    description: 'Sign in with your mobile number to save a list to your account and access it on another device.',
  },
  {
    icon: BadgeIndianRupee,
    title: 'Review listed prices',
    description: 'See staff-entered prices, units and offer details where they have been provided.',
  },
  {
    icon: MessageCircle,
    title: 'Continue with the team',
    description: 'Prepare a request, then review and send it through WhatsApp or email. Staff confirms the next steps.',
  },
];

const CONFIRM_WITH_STAFF = [
  'Exact product, brand, model, pack size and unit',
  'Current price, taxes, offer period and minimum quantity',
  'Stock, delivery availability, timing and site charges',
  'Product compatibility and technical suitability for your project',
];

export default function WhyUsPage({ onOpenBOMDrawer }: { onOpenBOMDrawer: () => void }) {
  return (
    <div className="why-us-page">
      <section className="page-hero-header">
        <div className="container">
          <div className="page-hero-content">
            <span className="badge-pill badge-orange-pill">A simpler way to prepare a request</span>
            <h1 className="page-title">Construction materials, organized in one place.</h1>
            <p className="page-subtitle">
              Browse published products, make a material list, and send your request to the Material Square team.
              The team confirms product and delivery details with you directly.
            </p>
            <div className="page-hero-actions">
              <Link to="/marketplace" className="btn btn-primary btn-lg">
                Browse materials <ArrowRight size={16} />
              </Link>
              <button type="button" className="btn btn-secondary btn-lg" onClick={onOpenBOMDrawer}>
                <ClipboardList size={17} /> Open material list
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="comparison-section">
        <div className="container">
          <div className="section-title-wrap text-center">
            <span className="badge-pill">Website features</span>
            <h2 className="section-title-clean">Plan your enquiry at your pace.</h2>
            <p className="section-subtitle-clean">
              The website helps you prepare. Product availability, final pricing and delivery are confirmed by staff.
            </p>
          </div>
          <div className="bingo-cards-grid reveal-stagger">
            {V1_FEATURES.map(({ icon: Icon, title, description }) => (
              <article className="bingo-card" key={title}>
                <div className="bingo-card-header">
                  <span className="bingo-number"><Icon size={19} /></span>
                  <div className="bingo-titles"><h3 className="bingo-title">{title}</h3></div>
                </div>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="site-bingo-section">
        <div className="container">
          <div className="section-title-wrap text-center">
            <span className="badge-pill badge-orange-pill">Before you place an order</span>
            <h2 className="section-title-clean">Confirm the details that affect your site.</h2>
          </div>
          <div className="brands-full-grid reveal-stagger">
            {CONFIRM_WITH_STAFF.map((detail) => (
              <article className="brand-card-detailed" key={detail}>
                <div className="brand-card-body"><p>{detail}</p></div>
              </article>
            ))}
          </div>
          <p className="v1-scope-note">
            A saved list or prepared WhatsApp/email message is not an order, accepted quotation, payment, or delivery booking.
          </p>
          <Link to="/contact" className="btn btn-primary">Contact the team</Link>
        </div>
      </section>
    </div>
  );
}
