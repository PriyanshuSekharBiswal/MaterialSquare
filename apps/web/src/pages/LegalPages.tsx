import { Link } from "react-router-dom";
import { COMPANY_INFO } from "../data/materialsData";

export function PrivacyPage() {
  return (
    <article className="legal-page container">
      <span className="badge-pill">Privacy</span>
      <h1>How we handle your information</h1>
      <p className="legal-updated">Material Square customer website · Draft for client review</p>

      <section>
        <h2>Information you provide</h2>
        <p>
          If you sign in, we use your mobile number to verify your account. You may also save your name,
          email, company, site address, city, PIN code, and material list so they are available when you
          sign in again. Browsing the public catalogue does not require an account.
        </p>
      </section>
      <section>
        <h2>How the website uses it</h2>
        <p>
          Account information is used to maintain your profile and saved material list and to prepare a
          request for you to review. The website records aggregate counts of page views, product-detail
          views, material-list additions, and WhatsApp or email handoff clicks for the staff dashboard.
          Those analytics do not include your name, phone number, saved-list contents, search text, or a
          visitor identifier.
        </p>
      </section>
      <section>
        <h2>WhatsApp and email requests</h2>
        <p>
          When you choose WhatsApp or email, your device opens that service with a message for you to
          review and send. Material Square does not receive the message or replies through this website,
          and opening the service does not confirm that a message was sent or delivered. Those services
          handle information under their own privacy terms.
        </p>
      </section>
      <section>
        <h2>Sign-in and account choices</h2>
        <p>
          A sign-in session can remain active on this browser for up to 30 days. You can sign out from
          your account page. To ask about access, correction, or deletion of account information, contact
          <a href={`mailto:${COMPANY_INFO.email}`}> {COMPANY_INFO.email}</a>. The business must confirm
          its request-handling and retention process before publication.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          For privacy questions, contact <a href={`mailto:${COMPANY_INFO.email}`}>{COMPANY_INFO.email}</a>.
          The client must verify this address and approve the final notice before launch.
        </p>
      </section>
      <p className="legal-review-note">
        This notice describes the current V1 website behavior. The business owner must confirm its legal
        identity, contact details, retention periods, request process, and final wording before the site
        is used with customers.
      </p>
      <Link className="btn btn-secondary" to="/terms">Read website terms</Link>
    </article>
  );
}

export function TermsPage() {
  return (
    <article className="legal-page container">
      <span className="badge-pill">Website terms</span>
      <h1>Using the Material Square website</h1>
      <p className="legal-updated">Material Square customer website · Draft for client review</p>

      <section>
        <h2>Catalogue information</h2>
        <p>
          Product descriptions, images, prices, offers, minimum quantities, and availability are
          maintained by Material Square staff. Catalogue images may be illustrative. Confirm the exact
          product, pack or unit, price, taxes, availability, delivery charges, and offer validity with
          staff before relying on them.
        </p>
      </section>
      <section>
        <h2>Material requests</h2>
        <p>
          The website can prepare a material request and open WhatsApp or email for you to review and
          send it. A prepared message, click, or saved material list is not an order, accepted quotation,
          payment, or delivery booking. Staff will confirm any commercial terms directly with you.
        </p>
      </section>
      <section>
        <h2>Accounts</h2>
        <p>
          You are responsible for access to the mobile number used to sign in and for signing out when
          you no longer want the current browser session to remain active. Keep your profile and saved
          material list accurate.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent to
          <a href={`mailto:${COMPANY_INFO.email}`}> {COMPANY_INFO.email}</a>. The business owner must
          confirm the responsible legal entity, contact information, and final terms before launch.
        </p>
      </section>
      <p className="legal-review-note">
        Draft for client and legal review. These website terms do not replace the commercial terms for a
        quotation, sale, delivery, return, or payment.
      </p>
      <Link className="btn btn-secondary" to="/privacy">Read privacy notice</Link>
    </article>
  );
}
