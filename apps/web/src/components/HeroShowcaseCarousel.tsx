import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  Layers,
  Wrench,
  Zap,
  Sparkles,
  Play,
  Pause,
} from 'lucide-react';
import WhatsAppIcon from './icons/WhatsAppIcon';
import { COMPANY_INFO } from '../data/materialsData';

export default function HeroShowcaseCarousel() {
  const slides = [
    {
      id: 1,
      badge: 'Consolidated Procurement',
      badgeIcon: ShieldCheck,
      hub: '1 Call · All Materials',
      image: '/images/carousel_1_why_5_calls.jpg',
      title: 'WHY MAKE 5 CALLS? ONE CALL. ALL MATERIALS.',
      featureTag: 'Cement · Steel · Pipes · Wires · Paints',
    },
    {
      id: 2,
      badge: '12 Brand Partners',
      badgeIcon: Layers,
      hub: 'Direct Stock',
      image: '/images/carousel_2_trusted_brands.jpg',
      title: 'BAS GHAR BANANA HAI? 12 TRUSTED BRANDS',
      featureTag: 'UltraTech · Astral · Polycab · Asian Paints',
    },
    {
      id: 3,
      badge: 'Electrical & Wires',
      badgeIcon: Zap,
      hub: 'Pure Copper',
      image: '/images/carousel_3_wires_cables.jpg',
      title: 'POLYCAB, FINOLEX & HAVELLS FR-LSH WIRES',
      featureTag: 'Connection Strong · Performance Bright',
    },
    {
      id: 4,
      badge: 'Paints & Finishes',
      badgeIcon: Sparkles,
      hub: 'Fresh Batches',
      image: '/images/carousel_4_paints_finishes.jpg',
      title: 'PERFECT RANG, PERFECT SHINE — BIRLA OPUS & ASIAN PAINTS',
      featureTag: 'Har Wall Lage Fine · 100% Fresh Batches',
    },
    {
      id: 5,
      badge: 'Site Procurement',
      badgeIcon: Truck,
      hub: 'Procurement Desk',
      image: '/images/carousel_5_expert_procurement.jpg',
      title: 'GOOGLE SE POOCH-POOCH KE THAK GAYE?',
      featureTag: 'Right Connection · Better Decisions',
    },
    {
      id: 6,
      badge: 'Zero Site Wastage',
      badgeIcon: ShieldCheck,
      hub: 'Direct Site Delivery',
      image: '/images/carousel_6_construction_bingo.jpg',
      title: 'CONSTRUCTION BINGO: ZERO DELAYS & ZERO IDLE LABOUR',
      featureTag: '9773505015 · Express Dispatch Across Delhi NCR',
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  // Auto-slide effect every 3.8 seconds
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 3800);

    return () => clearInterval(timer);
  }, [isPlaying, slides.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  // Touch swipe support for mobile/tablets
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

  const activeSlide = slides[currentIndex];
  const BadgeIcon = activeSlide.badgeIcon;

  return (
    <div
      className="fleet-showcase-card carousel-container"
      aria-label="Material Square Sliding Feature Carousel"
    >
      {/* Top Meta Bar */}
      <div className="showcase-card-header">
        <span className="fleet-badge">
          <BadgeIcon size={14} /> {activeSlide.badge}
        </span>
        <div className="header-right-controls">
          <span className="city-pill">{activeSlide.hub}</span>
          <button
            type="button"
            className="carousel-play-toggle"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Auto-slide' : 'Resume Auto-slide'}
            aria-label={isPlaying ? 'Pause Auto-slide' : 'Resume Auto-slide'}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>
        </div>
      </div>

      {/* Auto-Slide Progress Bar */}
      <div className="carousel-timer-bar-wrap">
        <div
          key={currentIndex}
          className={`carousel-timer-progress ${isPlaying ? 'running' : 'paused'}`}
        />
      </div>

      {/* Main Sliding Viewport */}
      <div
        className="carousel-slide-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Real Horizontal Sliding Track */}
        <div
          className="carousel-sliding-track"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div key={slide.id} className="carousel-slide-item">
              <div className="slide-image-wrapper">
                <img
                  src={slide.image}
                  alt={slide.title}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  className="carousel-slide-img"
                  onError={(e) => {
                    e.currentTarget.src = '/images/carousel_1_why_5_calls.jpg';
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Manual Navigation Arrows */}
        <button
          type="button"
          className="carousel-arrow-btn prev"
          onClick={handlePrev}
          aria-label="Previous Slide"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          className="carousel-arrow-btn next"
          onClick={handleNext}
          aria-label="Next Slide"
        >
          <ChevronRight size={20} />
        </button>

        {/* Slide Counter Badge */}
        <div className="carousel-counter-badge">
          <span>
            {currentIndex + 1} / {slides.length}
          </span>
        </div>

        {/* Pagination Dots */}
        <div className="carousel-dots-row">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`carousel-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Dispatch Info & Official WhatsApp CTA */}
      <div className="showcase-card-footer">
        <div className="dispatch-hotline-info">
          <span className="label">Order Hotline & WhatsApp</span>
          <span className="number">{COMPANY_INFO.phoneDisplay}</span>
        </div>
        <a
          href={COMPANY_INFO.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-whatsapp btn-sm showcase-whatsapp-btn"
          title="Chat with Material Square on WhatsApp"
        >
          <WhatsAppIcon size={18} color="#ffffff" />
          <span>WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
