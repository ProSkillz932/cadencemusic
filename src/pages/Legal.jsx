export default function Legal() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
      <div>
        <h1 className="text-2xl font-medium">Legal &amp; Rights Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: May 2026</p>
      </div>

      {[
        {
          title: 'Digital Rights Management (DRM)',
          body: `Cadence implements technological protection measures (TPMs) in accordance with applicable copyright law. All sheet music hosted on the Cadence platform is protected by digital rights management systems that restrict unauthorised reproduction, distribution, modification, and circumvention. Circumventing these measures may constitute a violation of the Digital Millennium Copyright Act (DMCA), the EU Copyright Directive (EUCD), and equivalent legislation in your jurisdiction.`,
        },
        {
          title: 'Licensing & Copyright',
          body: `All sheet music available through Cadence is either (a) licensed from rights holders under a formal licensing agreement, (b) in the public domain and verified as such, or (c) original works published with the express consent of the composer. Users may not reproduce, distribute, publicly perform, create derivative works from, or commercially exploit any sheet music accessed through Cadence without obtaining the appropriate licence from the relevant rights holder. Cadence Music Ltd. acts as a facilitator and is not the primary rights holder for third-party works.`,
        },
        {
          title: 'Permitted Use',
          body: `Premium subscribers are granted a limited, non-exclusive, non-transferable licence to download and use sheet music for personal, non-commercial practice and performance only. Downloaded files may not be shared, resold, uploaded to third-party platforms, or used in commercial recordings or broadcasts without explicit written authorisation. Free (ad-supported) users are granted a view-only licence for the duration of their session.`,
        },
        {
          title: 'Watermarking & Tracking',
          body: `All accessed sheet music is dynamically watermarked with the user's account identifier and session data. Cadence reserves the right to trace any unlawfully distributed copies back to the originating account. Accounts found to have distributed protected content without authorisation will be permanently suspended, and Cadence may pursue civil or criminal remedies available under applicable law.`,
        },
        {
          title: 'DMCA Takedown Policy',
          body: `If you believe that content hosted on Cadence infringes your copyright, please submit a DMCA takedown notice to legal@cadencemusic.io. Your notice must include: (a) identification of the copyrighted work, (b) identification of the infringing material and its location, (c) your contact information, (d) a statement of good faith belief, and (e) a statement of accuracy under penalty of perjury. Cadence will process valid notices within 10 business days.`,
        },
        {
          title: 'Disclaimer',
          body: `This document constitutes a placeholder for legal and compliance purposes and is subject to review and revision by qualified legal counsel. Nothing on this page constitutes formal legal advice. Cadence Music Ltd. is a fictitious entity used for demonstration purposes.`,
        },
      ].map(({ title, body }) => (
        <section key={title} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
          <p className="text-sm leading-relaxed text-foreground/80">{body}</p>
        </section>
      ))}
    </div>
  );
}