import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  Trash2,
  Send,
  Building,
  MapPin,
  Phone,
  FileText,
  CheckCircle2,
  Package,
} from 'lucide-react';
import WhatsAppIcon from './icons/WhatsAppIcon';
import { BrandLogo, getBrandMeta } from './icons/BrandBadges';
import { COMPANY_INFO } from '../data/materialsData';

export default function WhatsAppBOMDrawer({
  isOpen,
  onClose,
  bomList,
  onRemoveBOMItem,
  onClearBOM,
}) {
  const [siteLocation, setSiteLocation] = useState('Noida / Greater Noida');
  const [customListText, setCustomListText] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  if (!isOpen) return null;

  const handleSendToWhatsApp = (e) => {
    e.preventDefault();

    let itemsMessage = '';
    if (bomList.length > 0) {
      itemsMessage += '\n*Selected Materials:*\n';
      bomList.forEach((item, index) => {
        itemsMessage += `${index + 1}. ${item.name} (${item.code}) - ${item.brand}\n`;
      });
    }

    if (customListText.trim()) {
      itemsMessage += `\n*Site Material Requirement / Notes:*\n${customListText.trim()}\n`;
    }

    const fullMessage = `Hello Material Square!%0A*Name:* ${encodeURIComponent(contractorName || 'Builder / Contractor')}%0A*Phone:* ${encodeURIComponent(phoneNumber || 'Not specified')}%0A*Site Location:* ${encodeURIComponent(siteLocation)}%0A${encodeURIComponent(itemsMessage)}%0APlease share current wholesale pricing and site delivery timeline.`;

    const finalUrl = `https://wa.me/919773505015?text=${fullMessage}`;
    window.open(finalUrl, '_blank');
  };

  return (
    <div className="ms-drawer-backdrop" onClick={onClose}>
      <aside
        className="ms-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Send Material List"
      >
        {/* Drawer Header */}
        <div className="drawer-top-bar">
          <div className="drawer-title-group">
            <span className="drawer-eyebrow-tag">"{COMPANY_INFO.sloganHindi}"</span>
            <h3 className="drawer-main-title">Project Material List (BOM)</h3>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close Drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="drawer-body-scroll">
          {/* Selected Materials Strip */}
          <div className="selected-bom-section">
            <div className="bom-header-row">
              <span className="bom-count-label">
                Selected Materials ({bomList.length})
              </span>
              {bomList.length > 0 && (
                <button
                  type="button"
                  className="bom-clear-btn"
                  onClick={onClearBOM}
                >
                  <Trash2 size={13} /> Clear All
                </button>
              )}
            </div>

            {bomList.length === 0 ? (
              <div className="bom-empty-box">
                <Package size={32} className="empty-pkg-icon" />
                <p>No materials added from catalog yet.</p>
                <span className="empty-sub">
                  You can type your handwritten shopping list directly below!
                </span>
              </div>
            ) : (
              <div className="bom-items-stack">
                {bomList.map((item) => {
                  const brandMeta = getBrandMeta(item.brand);
                  return (
                    <div key={item.id} className="bom-item-row">
                      <div className="bom-item-info">
                        <div className="bom-item-brand-header">
                          <div className="bom-mini-brand-logo-frame">
                            <BrandLogo id={brandMeta?.id} className="bom-mini-brand-svg" />
                          </div>
                          <span className="bom-item-code mono">{item.code}</span>
                        </div>
                        <h4 className="bom-item-name">{item.name}</h4>
                        <span className="bom-item-meta">{item.brand} · {item.unit}</span>
                      </div>
                      <button
                        type="button"
                        className="bom-remove-action"
                        onClick={() => onRemoveBOMItem(item.id)}
                        title="Remove item"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form for WhatsApp Direct Dispatch */}
          <form className="bom-submit-form" onSubmit={handleSendToWhatsApp}>
            <div className="form-legend-header">
              <WhatsAppIcon size={18} color="#16a34a" />
              <span>Direct WhatsApp Procurement Desk</span>
            </div>

            <div className="input-group">
              <label htmlFor="contractorName">Your Name / Contractor Firm *</label>
              <input
                id="contractorName"
                type="text"
                required
                placeholder="e.g. Ramesh Sharma / BuildCraft Projects"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="phoneNumber">WhatsApp Number *</label>
              <input
                id="phoneNumber"
                type="tel"
                required
                placeholder="e.g. 98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="siteLocation">Project Location in Delhi NCR *</label>
              <select
                id="siteLocation"
                value={siteLocation}
                onChange={(e) => setSiteLocation(e.target.value)}
              >
                <option value="Noida / Greater Noida">Noida / Greater Noida (Expressway & Sectors)</option>
                <option value="South / East / West Delhi">Delhi (South, East, West, North)</option>
                <option value="Gurugram / Golf Course Road">Gurugram (Golf Course, Sohna Road, Cyber Hub)</option>
                <option value="Ghaziabad / Indirapuram">Ghaziabad (Indirapuram, Raj Nagar, Vasundhara)</option>
                <option value="Faridabad / Neharpar">Faridabad / Greater Faridabad</option>
              </select>
            </div>

            <div className="input-group bom-custom-list-group">
              <div className="bom-field-label-row">
                <label htmlFor="customList">Required Materials & Quantities</label>
                <span className="bom-hindi-badge">"Material ki list khatam hi nahi ho rahi!"</span>
              </div>
              
              <div className="bom-textarea-wrapper">
                <textarea
                  id="customList"
                  rows="4"
                  className="bom-custom-textarea"
                  placeholder="Type your required materials & quantities (e.g. 200 bags Cement, 2 MT TMT Steel, CPVC fittings, Asian Paints)..."
                  value={customListText}
                  onChange={(e) => setCustomListText(e.target.value)}
                />
                {customListText && (
                  <button
                    type="button"
                    className="bom-text-clear-btn"
                    onClick={() => setCustomListText('')}
                    title="Clear text"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <button type="submit" className="bom-whatsapp-submit-btn">
              <span className="bom-wa-icon-bubble">
                <WhatsAppIcon size={20} color="#ffffff" />
              </span>
              <span className="bom-wa-text-group">
                <span className="bom-wa-main-text">Send Material List on WhatsApp</span>
                <span className="bom-wa-sub-text">Direct connect with procurement desk</span>
              </span>
              <Send size={16} className="bom-wa-arrow-icon" />
            </button>

            <div className="bom-dispatch-guarantee">
              <CheckCircle2 size={15} />
              <span>Same-day consolidated quote with verified factory trade rates.</span>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}
