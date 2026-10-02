import type { MaterialItem, CatalogueProduct } from '../types';
import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MessageCircle,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { CONSTRUCTION_BINGO, COMPANY_INFO } from '../data/materialsData';

export default function SiteBingo({ onOpenBOM }: { onOpenBOM: () => void }) {
  const [checkedIds, setCheckedIds] = useState(new Set(['delayed-delivery', 'wrong-size']));

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const checkCount = checkedIds.size;

  return (
    <section id="site-bingo" className="ms-bingo-section">
      <div className="container">
        {/* Section Header */}
        <div className="bingo-header">
          <span className="badge-orange">Real Site Challenges</span>
          <h2 className="section-title">How Many Have You Seen on a Site?</h2>
          <p className="section-subtitle">
            Construction shouldn't feel like gambling with delays and broken bags.
            Select the issues you've experienced below and see how Material Square's protocol prevents them.
          </p>
        </div>

        {/* The Clipboard Layout (Recreating the official poster layout!) */}
        <div className="bingo-clipboard-wrapper">
          <div className="clipboard-top-clip">
            <span className="clip-metal"></span>
          </div>

          <div className="clipboard-paper">
            <div className="paper-header">
              <span className="stamp-badge">CONSTRUCTION BINGO</span>
              <p className="paper-lead">Click any box to check site headaches you have faced:</p>
            </div>

            {/* 6 Bingo Tiles Grid */}
            <div className="bingo-tiles-grid">
              {CONSTRUCTION_BINGO.map((item) => {
                const isChecked = checkedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`bingo-tile ${isChecked ? 'is-checked' : ''}`}
                    onClick={() => toggleCheck(item.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="tile-check-row">
                      {isChecked ? (
                        <CheckSquare className="check-box checked" size={24} />
                      ) : (
                        <Square className="check-box" size={24} />
                      )}
                      <h4 className="tile-title">{item.title}</h4>
                    </div>

                    <p className="tile-hindi-quote">"{item.hindiSub}"</p>

                    <div className="tile-solution-box">
                      <span className="sol-label">
                        <ShieldCheck size={13} /> Material Square Solution:
                      </span>
                      <p className="sol-desc">{item.solution}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Assessment & Guarantee Strip */}
            <div className="bingo-verdict-bar">
              <div className="verdict-count">
                <span className="score-num">{checkCount} of 6</span>
                <span className="score-label">Site head-aches identified</span>
              </div>

              <div className="verdict-message">
                <h4>
                  {checkCount >= 3
                    ? '⚠️ Your project is vulnerable to costly delays & wastage!'
                    : 'Stop chasing scattered suppliers and protect your construction budget.'}
                </h4>
                <p>
                  Material Square assigns a single procurement coordinator for your drawings, BOM, and delivery schedule.
                </p>
              </div>

              <div className="verdict-actions">
                <button
                  type="button"
                  className="btn btn-orange btn-sm"
                  onClick={onOpenBOM}
                >
                  Send Site List (BOM)
                </button>
                <a
                  href={COMPANY_INFO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-sm"
                >
                  <MessageCircle size={14} /> Talk to Site Manager
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
