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
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:px-8 lg:px-12">
          <article className={`${workSans.className} prose prose-slate max-w-none`}>
            <h1 className={`${alteHaasGrotesk.className} text-5xl sm:text-6xl font-bold text-[#333333] mb-4 text-center`}>Privacy Policy</h1>
            <p className="text-sm text-[#333333]/60 mb-12 text-center">
              <strong>Last Updated: November 17, 2025</strong>
            </p>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>Introduction</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                Samurai Insurance (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates www.joinsamurai.com (the &quot;Site&quot;).
                This Privacy Policy explains how we collect, use, disclose, and protect your personal information
                when you use our insurance comparison services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>Beta Service Notice</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">
                Samurai Insurance is currently operating in beta. Our services are under development and may
                change as we test and improve our platform. During this beta period:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Features and functionality may be modified or discontinued</li>
                <li>We are actively collecting user feedback to improve our services</li>
                <li>Service availability may be limited or interrupted</li>
                <li>Some features described in this policy may not yet be fully implemented</li>
              </ul>
              <p className="text-[#333333]/80 leading-relaxed mt-4">
                Your participation in our beta helps us build a better product. By using our beta services,
                you acknowledge that the platform is still being refined.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>Information We Collect</h2>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>
                  <strong>Contact Information:</strong> Name, email address, phone number, mailing address
                </li>
                <li>
                  <strong>Insurance Information:</strong> Current insurance details, coverage preferences,
                  vehicle information, property details
                </li>
                <li>
                  <strong>Demographic Information:</strong> Age, date of birth, marital status, occupation
                </li>
                <li>
                  <strong>Financial Information:</strong> Payment information for policies purchased through
                  our platform
                </li>
              </ul>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>Information Collected Automatically</h3>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>
                  <strong>Usage Data:</strong> Pages visited, time spent on site, click patterns, referring URLs
                </li>
                <li>
                  <strong>Device Information:</strong> IP address, browser type, operating system, device identifiers
                </li>
                <li>
                  <strong>Location Data:</strong> General geographic location based on IP address
                </li>
                <li>
                  <strong>Cookies and Tracking Technologies:</strong> See &quot;Cookies and Tracking&quot; section below
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>How We Use Your Information</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Provide insurance quotes and comparison services</li>
                <li>Connect you with insurance carriers and agents</li>
                <li>Process transactions and manage your account</li>
                <li>Communicate with you about your requests and our services</li>
                <li>Improve our website and services</li>
                <li>Comply with legal obligations</li>
                <li>Prevent fraud and ensure security</li>
                <li>Send marketing communications (with your consent)</li>
                <li>Analyze website performance and user behavior</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>How We Share Your Information</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">We may share your information with:</p>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>Insurance Providers and Agents</h3>
              <p className="text-[#333333]/80 leading-relaxed">
                We share your information with insurance carriers and licensed agents to provide you with
                quotes and coverage options.
              </p>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>Service Providers</h3>
              <p className="text-[#333333]/80 leading-relaxed mb-3">
                We work with third-party service providers who perform services on our behalf, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Payment processors</li>
                <li>Customer support platforms</li>
                <li>Analytics providers</li>
                <li>Marketing and advertising partners</li>
                <li>Cloud hosting services</li>
              </ul>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>Advertising Partners</h3>
              <p className="text-[#333333]/80 leading-relaxed">
                We use advertising partners, including Meta (Facebook/Instagram), Google, and other platforms
                to deliver targeted advertisements. These partners may collect information through cookies and
                similar technologies. We may share hashed or anonymized identifiers for advertising purposes.
              </p>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>Legal Requirements</h3>
              <p className="text-[#333333]/80 leading-relaxed">
                We may disclose your information when required by law, legal process, or to protect our rights,
                property, or safety, or that of others.
              </p>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>Business Transfers</h3>
              <p className="text-[#333333]/80 leading-relaxed">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred
                to the acquiring entity.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>Cookies and Tracking Technologies</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">
                We use cookies, pixels, and similar technologies to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Remember your preferences</li>
                <li>Understand how you use our Site</li>
                <li>Deliver personalized advertising</li>
                <li>Measure advertising effectiveness</li>
                <li>Improve our services</li>
              </ul>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>Types of Cookies We Use:</h3>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li><strong>Essential Cookies:</strong> Necessary for site functionality</li>
                <li><strong>Analytics Cookies:</strong> Help us understand site usage</li>
                <li><strong>Advertising Cookies:</strong> Used to deliver relevant ads</li>
                <li><strong>Social Media Cookies:</strong> Enable social sharing features</li>
              </ul>
              <p className="text-[#333333]/80 leading-relaxed mt-4">
                You can control cookies through your browser settings, but disabling cookies may limit site
                functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>
                Third-Party Advertising and Analytics
              </h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">
                We use third-party advertising and analytics services, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>
                  <strong>Meta Pixel:</strong> To measure ad performance and deliver targeted ads on Facebook
                  and Instagram
                </li>
                <li>
                  <strong>Google Analytics and Google Ads:</strong> To analyze site traffic and deliver targeted
                  advertising
                </li>
                <li>
                  <strong>Other Ad Networks:</strong> To reach potential customers across the web
                </li>
              </ul>
              <p className="text-[#333333]/80 leading-relaxed mt-4">
                These services may collect information about your online activities across different websites
                and services. They may use cookies, device identifiers, and similar technologies to collect
                this information.
              </p>
              <p className="text-[#333333]/80 leading-relaxed mt-4">
                To opt out of interest-based advertising, visit:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Digital Advertising Alliance: www.aboutads.info/choices</li>
                <li>Network Advertising Initiative: www.networkadvertising.org/choices</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>Your Privacy Rights</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>All Users</h3>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your information (subject to legal obligations)</li>
                <li>Opt out of marketing communications</li>
                <li>Object to certain processing of your information</li>
              </ul>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>
                California Residents (CCPA/CPRA)
              </h3>
              <p className="text-[#333333]/80 leading-relaxed mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Know what personal information we collect, use, and share</li>
                <li>Request deletion of your personal information</li>
                <li>Opt out of the sale or sharing of your personal information</li>
                <li>Non-discrimination for exercising your rights</li>
              </ul>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>European Users (GDPR)</h3>
              <p className="text-[#333333]/80 leading-relaxed mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Access, rectify, or erase your personal data</li>
                <li>Restrict or object to processing</li>
                <li>Data portability</li>
                <li>Withdraw consent</li>
                <li>Lodge a complaint with a supervisory authority</li>
              </ul>

              <p className="text-[#333333]/80 leading-relaxed mt-4">
                To exercise your rights, contact us at info@joinsamurai.com or use the contact information below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>
                Do Not Sell or Share My Personal Information
              </h2>
              <p className="text-[#333333]/80 leading-relaxed">
                We may share your information with advertising partners for targeted advertising purposes.
                Under certain privacy laws, this may be considered a &quot;sale&quot; or &quot;share&quot; of
                information. You have the right to opt out of this sharing.
              </p>
              <p className="text-[#333333]/80 leading-relaxed mt-4">
                To opt out, click here: [Do Not Sell or Share My Personal Information] or email
                info@joinsamurai.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>Data Security</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                We implement reasonable security measures to protect your information from unauthorized access,
                alteration, disclosure, or destruction. However, no internet transmission is completely secure,
                and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>Data Retention</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                We retain your personal information for as long as necessary to provide our services, comply
                with legal obligations, resolve disputes, and enforce our agreements. When we no longer need
                your information, we securely delete or anonymize it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>Children&apos;s Privacy</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                Our services are not directed to individuals under 18. We do not knowingly collect personal
                information from children. If you believe we have collected information from a child, please
                contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>International Data Transfers</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. We
                ensure appropriate safeguards are in place to protect your information in accordance with
                this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>Changes to This Privacy Policy</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of material changes
                by posting the updated policy on our Site with a new &quot;Last Updated&quot; date. Your
                continued use of our services after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>Contact Us</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">
                If you have questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="bg-[#de5e48]/5 border-l-4 border-[#de5e48] p-4 rounded">
                <p className="text-[#333333] font-semibold mb-2">Samurai Insurance</p>
                <p className="text-[#333333]/80">Email: info@joinsamurai.com</p>
                <p className="text-[#333333]/80">Address: 5 West Main Street, Westerville, OH 43081</p>
                <p className="text-[#333333]/80">Phone: (614) 321-7718</p>
              </div>
              <p className="text-[#333333]/80 leading-relaxed mt-4">
                For California residents, you may also contact us to request information about our disclosure
                of personal information to third parties for their direct marketing purposes.
              </p>
            </section>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
