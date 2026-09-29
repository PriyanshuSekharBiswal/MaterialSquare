import React, { useState } from 'react';
import {
  FileText,
  Upload,
  MessageCircle,
  Phone,
  CheckCircle2,
  MapPin,
  Calendar,
  Layers,
  Building,
  Plus,
  Trash2,
  Clock,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { COMPANY_INFO, PRODUCTS } from '../data/materialsData';
import WhatsAppIcon from '../components/icons/WhatsAppIcon';

export default function GetQuotePage({ onAddCustomToBOM }) {
  // Form State
  const [projectStage, setProjectStage] = useState('rcc');
  const [siteLocation, setSiteLocation] = useState('Noida');
  const [customAddress, setCustomAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryTiming, setDeliveryTiming] = useState('within-48h');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Line items state
  const [lineItems, setLineItems] = useState([
    { id: 1, material: 'UltraTech PPC Cement (50kg)', quantity: '100', unit: 'Bags' },
    { id: 2, material: 'Tata Tiscon 550D TMT Rebar (12mm)', quantity: '2', unit: 'Metric Tons' },
    { id: 3, material: 'Astral CPVC Pro SDR 11 Pipe (3/4")', quantity: '25', unit: 'Lengths (3m)' },
  ]);

  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('Units');

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setLineItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        material: newItemName.trim(),
        quantity: newItemQty.trim() || '1',
        unit: newItemUnit,
      },
    ]);
    setNewItemName('');
    setNewItemQty('');
  };

  const handleRemoveItem = (id) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Compile WhatsApp message
  const generateWhatsAppMessage = () => {
    let msg = `*MATERIAL SQUARE — SITE QUOTE REQUEST*\n`;
    msg += `----------------------------------------\n`;
    msg += `👤 *Client Name:* ${contactName || 'Builder / Contractor'}\n`;
    msg += `📞 *Phone:* ${contactPhone || 'N/A'}\n`;
    msg += `📍 *Site Zone:* ${siteLocation} ${customAddress ? `(${customAddress})` : ''}\n`;
    msg += `🏗️ *Project Phase:* ${projectStage.toUpperCase()}\n`;
    msg += `⏱️ *Required Delivery:* ${deliveryTiming}\n\n`;
    msg += `📋 *MATERIALS REQUIRED (BOM):*\n`;

    lineItems.forEach((item, index) => {
      msg += `${index + 1}. ${item.material} — *${item.quantity} ${item.unit}*\n`;
    });

    if (notes.trim()) {
      msg += `\n💬 *Site Notes:* ${notes.trim()}\n`;
    }

    msg += `----------------------------------------\n`;
    msg += `Please provide lowest wholesale site delivery rate with GST bill.`;

    return encodeURIComponent(msg);
  };

  const handleOnlineSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="quote-page">
      {/* Page Header */}
      <section className="page-hero-header">
        <div className="container">
          <div className="page-hero-content">
            <span className="badge-pill badge-orange-pill">Fast Consolidated Procurement</span>
            <h1 className="page-title">Request a Site Delivery Quotation</h1>
            <p className="page-hindi-highlight">
              "Ghar banana tha... Material ki list khatam hi nahi ho rahi!"
            </p>
            <p className="page-subtitle">
              Send your handwritten contractor list, structural drawing schedule, or compile required items below. Our procurement team responds within 30 minutes with transparent wholesale pricing.
            </p>
          </div>
        </div>
      </section>

      {/* Main Form Section */}
      <section className="quote-form-section">
        <div className="container">
          {isSubmitted ? (
            <div className="quote-success-card">
              <div className="success-icon-wrap">
                <CheckCircle2 size={48} className="green-check" />
              </div>
              <h2>Quotation Request Received!</h2>
              <p>
                Thank you, <strong>{contactName || 'Valued Builder'}</strong>. Our Delhi NCR logistics desk is reviewing your requirements for <strong>{siteLocation}</strong>.
              </p>
              <div className="success-summary-box">
                <h4>Items In Your Request ({lineItems.length}):</h4>
                <ul>
                  {lineItems.map((item, idx) => (
                    <li key={idx}>
                      {item.material} — <strong>{item.quantity} {item.unit}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="success-actions">
                <a
                  href={`https://wa.me/919773505015?text=${generateWhatsAppMessage()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-lg"
                >
                  <WhatsAppIcon size={20} color="#ffffff" />
                  <span>Send This Directly to Our WhatsApp Desk Now</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="btn btn-secondary"
                >
                  Edit / Submit Another Request
                </button>
              </div>
            </div>
          ) : (
            <div className="quote-builder-grid">
              {/* Left Column: BOM Item List Builder */}
              <div className="quote-items-col">
                <div className="card-box">
                  <div className="card-box-header">
                    <div className="header-icon-title">
                      <FileText size={20} className="icon-orange" />
                      <h3>1. Materials List (BOM)</h3>
                    </div>
                    <span className="items-count-badge">{lineItems.length} items added</span>
                  </div>

                  <p className="box-sub">
                    Specify brand preferences, sizes, and quantities. Add as many items as needed.
                  </p>

                  {/* Line Items List */}
                  <div className="quote-items-table-wrap">
                    {lineItems.length > 0 ? (
                      <table className="quote-table">
                        <thead>
                          <tr>
                            <th>Material & Specification</th>
                            <th>Quantity</th>
                            <th>Unit</th>
                            <th>Remove</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((item) => (
                            <tr key={item.id}>
                              <td className="item-name-cell">
                                <strong>{item.material}</strong>
                              </td>
                              <td className="item-qty-cell">{item.quantity}</td>
                              <td className="item-unit-cell">{item.unit}</td>
                              <td className="item-action-cell">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="remove-item-btn"
                                  aria-label="Remove item"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="empty-items-notice">
                        No materials in your list yet. Add items using the inputs below.
                      </div>
                    )}
                  </div>

                  {/* Add Item Form */}
                  <form onSubmit={handleAddItem} className="add-item-form-row">
                    <input
                      type="text"
                      placeholder="e.g. Ambuja Kawach Cement, Polycab 4.0mm wire..."
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="add-item-input name"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      className="add-item-input qty"
                      min="1"
                    />
                    <select
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      className="add-item-select unit"
                    >
                      <option value="Bags">Bags (50kg)</option>
                      <option value="Metric Tons">Metric Tons (MT)</option>
                      <option value="Lengths (3m)">Lengths (3m)</option>
                      <option value="Lengths (6m)">Lengths (6m)</option>
                      <option value="Coils (90m)">Coils (90m)</option>
                      <option value="Drums (20L)">Drums (20L)</option>
                      <option value="Boxes">Boxes</option>
                      <option value="Pieces">Pieces / Sets</option>
                    </select>

                    <button type="submit" className="btn btn-secondary add-btn">
                      <Plus size={16} /> Add
                    </button>
                  </form>
                </div>

                {/* Upload Handwritten List Notice */}
                <div className="quick-upload-banner">
                  <div className="upload-icon-circle">
                    <Upload size={20} />
                  </div>
                  <div className="upload-text">
                    <h4>Have a Handwritten Contractor List or Structural Drawing?</h4>
                    <p>
                      No time to type? Take a photo of the slip or send the PDF directly to our WhatsApp procurement desk. We will convert it into an itemized quote.
                    </p>
                    <a
                      href={`https://wa.me/919773505015?text=${encodeURIComponent(
                        'Hello Material Square, I am sharing a photo / drawing of our site material requirement. Please prepare a consolidated quotation.'
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="whatsapp-upload-link"
                    >
                      <WhatsAppIcon size={16} color="currentColor" />
                      <span>Send Photo/PDF via WhatsApp: {COMPANY_INFO.phoneDisplay}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Right Column: Site & Contact Details */}
              <div className="quote-details-col">
                <div className="card-box">
                  <div className="card-box-header">
                    <div className="header-icon-title">
                      <Building size={20} className="icon-orange" />
                      <h3>2. Site & Delivery Details</h3>
                    </div>
                  </div>

                  <form onSubmit={handleOnlineSubmit} className="quote-details-form">
                    {/* Project Stage */}
                    <div className="form-field">
                      <label>Current Construction Stage:</label>
                      <select
                        value={projectStage}
                        onChange={(e) => setProjectStage(e.target.value)}
                        className="form-select"
                      >
                        <option value="foundation">Foundation / Raft / Excavation</option>
                        <option value="rcc">RCC Columns, Beams & Slab Casting</option>
                        <option value="brickwork">Brickwork, Masonry & Plaster</option>
                        <option value="plumbing-elec">Plumbing & Electrical Rough-in</option>
                        <option value="finishing">Flooring, Tile Adhesives & Painting</option>
                      </select>
                    </div>

                    {/* Delhi NCR Location */}
                    <div className="form-field">
                      <label>Site Location (Delhi NCR Zone):</label>
                      <select
                        value={siteLocation}
                        onChange={(e) => setSiteLocation(e.target.value)}
                        className="form-select"
                      >
                        <option value="Noida">Noida (All Sectors)</option>
                        <option value="Greater Noida">Greater Noida & Pari Chowk</option>
                        <option value="Greater Noida West">Greater Noida West (Noida Extension)</option>
                        <option value="South Delhi">South Delhi / Central Delhi</option>
                        <option value="East Delhi">East Delhi / Mayur Vihar</option>
                        <option value="Gurugram">Gurugram (Golf Course / Sohna / Dwarka Exp)</option>
                        <option value="Ghaziabad">Ghaziabad / Indirapuram / Raj Nagar</option>
                        <option value="Faridabad">Faridabad</option>
                      </select>
                    </div>

                    {/* Specific Address or Landmark */}
                    <div className="form-field">
                      <label>Site Landmark / Plot Number (Optional):</label>
                      <input
                        type="text"
                        placeholder="e.g. Sector 128, near Jaypee Hospital"
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    {/* Delivery Timing */}
                    <div className="form-field">
                      <label>Required Delivery Timeline:</label>
                      <div className="radio-pill-group">
                        <label className={`radio-pill ${deliveryTiming === 'emergency' ? 'active' : ''}`}>
                          <input
                            type="radio"
                            name="timing"
                            value="emergency"
                            checked={deliveryTiming === 'emergency'}
                            onChange={(e) => setDeliveryTiming(e.target.value)}
                          />
                          <span>Urgent (Same Day)</span>
                        </label>
                        <label className={`radio-pill ${deliveryTiming === 'within-48h' ? 'active' : ''}`}>
                          <input
                            type="radio"
                            name="timing"
                            value="within-48h"
                            checked={deliveryTiming === 'within-48h'}
                            onChange={(e) => setDeliveryTiming(e.target.value)}
                          />
                          <span>Next Day (24-48 Hours)</span>
                        </label>
                        <label className={`radio-pill ${deliveryTiming === 'scheduled' ? 'active' : ''}`}>
                          <input
                            type="radio"
                            name="timing"
                            value="scheduled"
                            checked={deliveryTiming === 'scheduled'}
                            onChange={(e) => setDeliveryTiming(e.target.value)}
                          />
                          <span>Scheduled Casting Date</span>
                        </label>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="form-field-row">
                      <div className="form-field">
                        <label>Your Name / Company:</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Sharma (Contractor)"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div className="form-field">
                        <label>Mobile Number:</label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 98100 XXXXX"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>

                    {/* Special Instructions */}
                    <div className="form-field">
                      <label>Additional Notes / Site Access Restrictions:</label>
                      <textarea
                        rows="2"
                        placeholder="e.g. Crane required for unloading steel, narrow colony lane (small truck needed)..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="form-textarea"
                      ></textarea>
                    </div>

                    {/* Two Submission Options */}
                    <div className="form-submit-actions">
                      <a
                        href={`https://wa.me/919773505015?text=${generateWhatsAppMessage()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-whatsapp btn-block btn-lg"
                      >
                        <WhatsAppIcon size={20} color="#ffffff" />
                        <span>Send to WhatsApp Hotline (+91 97735 05015)</span>
                      </a>

                      <button type="submit" className="btn btn-primary btn-block">
                        <Send size={16} />
                        <span>Submit Online Inquiry</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
