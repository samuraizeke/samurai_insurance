import { Metadata } from "next";
import { workSans, alteHaasGrotesk } from "@/lib/fonts";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy | Samurai Insurance",
  description:
    "Privacy Policy for Samurai Insurance - Learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:px-8 lg:px-12">
          <article className={`${workSans.className} prose prose-slate max-w-none`}>
            <h1 className={`${alteHaasGrotesk.className} text-5xl sm:text-6xl font-bold text-[#333333] mb-4 text-center`}>Privacy Policy</h1>
            <p className="text-sm text-[#333333]/60 mb-12 text-center">
              <strong>Last Updated: December 9, 2025</strong>
            </p>

            <p className="text-[#333333]/80 leading-relaxed mb-8">
              Samurai Insurance Inc (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is a licensed Ohio insurance broker. This Privacy Policy explains how we collect, use, disclose, and protect your information when you visit our website, create an account, or interact with our AI agent &quot;Sam.&quot;
            </p>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>1. Information We Collect</h2>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>A. Information You Provide Directly</h3>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li><strong>Identity &amp; Contact:</strong> name, date of birth, address, phone, email</li>
                <li><strong>Risk &amp; Underwriting Data:</strong> driver&apos;s license, SSN (when required by carriers), VIN, vehicle/property details, driving and claims history</li>
                <li><strong>Chat &amp; Voice Interactions:</strong> full transcripts and recordings of all conversations with Sam</li>
                <li><strong>Payment Information:</strong> processed through PCI-DSS Level 1 compliant third-party processors (we do not store full card numbers)</li>
              </ul>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>B. Information We Collect Automatically</h3>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Device and usage data (IP address, browser, pages visited)</li>
                <li>Cookies and similar tracking technologies (see Section 9)</li>
              </ul>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>C. Information from Third Parties</h3>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Consumer reporting agencies (insurance scores, MVR, CLUE)</li>
                <li>Public records and data enrichment services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>2. How We Use Your Information</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">We use your information only for the following business purposes:</p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Generating quotes and submitting applications to insurance carriers</li>
                <li>Facilitating policy purchase, renewal, and claims assistance</li>
                <li>Operating, improving, and training Sam using fully de-identified and aggregated data only</li>
                <li>Complying with legal and regulatory obligations</li>
                <li>Protecting against fraud and security risks</li>
              </ul>
              <p className="text-[#333333]/80 leading-relaxed mt-4">
                We never sell your personal information and never use identifiable data to train third-party or public AI models.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>3. How We Share Your Information</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">We share only when necessary and only with:</p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li><strong>Insurance Carriers</strong> to obtain the quotes and coverage you request (required sharing – you cannot opt out)</li>
                <li><strong>Service Providers</strong> under strict confidentiality agreements (cloud hosting, payment processors, identity verification, analytics)</li>
                <li><strong>Regulators and law enforcement</strong> when required</li>
                <li><strong>A successor entity</strong> in the event of merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>4. Use of Artificial Intelligence</h2>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Sam uses artificial intelligence to analyze your information, recommend coverage, and generate real-time quotes from carriers.</li>
                <li>You may request a human review of any AI-generated recommendation or quote by calling (614) 321-7718.</li>
                <li><strong>Limitations:</strong> While we strive for accuracy, AI outputs can contain errors. The final terms are always determined by the official Carrier policy documents, not Sam.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>5. Your Federal Privacy Rights (Gramm-Leach-Bliley Act – Annual Notice)</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">Federal law requires us to tell you:</p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>We do not sell your personal information.</li>
                <li>We do not share your information with non-affiliated third parties for their own marketing.</li>
                <li>We do share your information with insurance carriers and service providers to fulfill your requests. You cannot opt out of this required sharing.</li>
                <li>If we ever share with non-affiliates for joint marketing, you will have the right to opt out.</li>
              </ul>
              <p className="text-[#333333]/80 leading-relaxed mt-4">
                You may exercise any available opt-out by contacting us (Section 13).
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>6. Security &amp; Data Protection</h2>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>We implement administrative, technical, and physical safeguards, including industry-standard encryption (TLS) for data in transit and at rest, to protect your information in accordance with the Ohio Data Protection Act and other applicable laws.</li>
                <li>In the event of a data breach affecting your information, we will notify you and relevant authorities as required by law.</li>
                <li>We retain customer records (including chat transcripts and applications) for a minimum of seven (7) years after the policy expiration or account termination, as required by Ohio insurance regulations and our professional liability duties.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>7. Voice Recordings &amp; Biometric Data</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                Voice interactions with Sam are recorded for quality and compliance. Voiceprints may be considered biometric information under applicable law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>8. Cookies &amp; Tracking</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                We use necessary cookies for site functionality and analytics cookies (with your consent) to improve performance. You can manage preferences via the cookie banner.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>9. Children&apos;s Privacy</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                Our services are for adults 18+. We do not knowingly collect data from children under 13.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>10. Do Not Track</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                We do not currently respond to browser &quot;Do Not Track&quot; signals.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>11. Changes to This Policy</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                Material changes will be notified by email or prominent notice in your dashboard. Continued use after the effective date constitutes acceptance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>12. Contact Us</h2>
              <div className="bg-[#de5e48]/5 border-l-4 border-[#de5e48] p-4 rounded">
                <p className="text-[#333333] font-semibold mb-2">Samurai Insurance Inc</p>
                <p className="text-[#333333]/80">5 W Main Street</p>
                <p className="text-[#333333]/80">Westerville, OH 43081</p>
                <p className="text-[#333333]/80">Phone: (614) 321-7718</p>
                <p className="text-[#333333]/80 mt-2">
                  Privacy requests: <a href="mailto:info@joinsamurai.com" className="text-[#de5e48] hover:underline">info@joinsamurai.com</a>
                </p>
              </div>
            </section>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
