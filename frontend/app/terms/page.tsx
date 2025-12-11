import { Metadata } from "next";
import { workSans, alteHaasGrotesk } from "@/lib/fonts";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Use | Samurai Insurance",
  description:
    "Terms of Use for Samurai Insurance - Read our terms and conditions before using our services.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:px-8 lg:px-12">
          <article className={`${workSans.className} prose prose-slate max-w-none`}>
            <h1 className={`${alteHaasGrotesk.className} text-5xl sm:text-6xl font-bold text-[#333333] mb-4 text-center`}>Terms of Use</h1>
            <p className="text-sm text-[#333333]/60 mb-12 text-center">
              <strong>Last Updated: December 9, 2025</strong>
            </p>

            <section className="mb-8">
              <div className="bg-[#de5e48]/10 border-l-4 border-[#de5e48] p-6 rounded mb-8">
                <h2 className={`${alteHaasGrotesk.className} text-xl font-bold text-[#333333] mb-4`}>IMPORTANT NOTICE – READ BEFORE USING SAM</h2>
                <p className="text-[#333333]/80 leading-relaxed mb-4">
                  Sam is an artificial intelligence system that reviews the information you provide, suggests appropriate coverage levels, and returns real-time quotes from licensed insurance carriers.
                </p>
                <p className="text-[#333333]/80 leading-relaxed mb-4">
                  <strong>Sam may occasionally make mistakes or &quot;hallucinations.&quot;</strong>
                </p>
                <p className="text-[#333333]/80 leading-relaxed mb-4">
                  You are solely responsible for verifying that all recommendations, limits, exclusions, and premium amounts are correct before accepting coverage.
                </p>
                <p className="text-[#333333]/80 leading-relaxed mb-4">
                  <strong>The official policy documents issued by the insurance carrier are the only binding source of truth.</strong>
                </p>
                <p className="text-[#333333]/80 leading-relaxed">
                  By creating an account or interacting with Sam, you agree to be bound by these Terms. If you do not agree, do not use our services.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>1. Who We Are</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">
                Samurai Insurance Inc (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is a licensed independent retail insurance broker domiciled and licensed exclusively in the State of Ohio (Ohio Producer License # 1701182)
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>We are <strong>NOT</strong> an insurance carrier. We do not underwrite risks, issue policies, pay claims, or make final coverage decisions.</li>
                <li>We act solely as an intermediary between you and third-party insurance carriers.</li>
                <li>We do <strong>NOT</strong> have binding authority. Coverage becomes effective only when the carrier formally accepts the risk.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>2. Eligibility &amp; Geographic Restrictions</h2>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>You must be at least 18 years old and a resident of the State of Ohio to obtain quotes, submit applications, or purchase insurance through Samurai Insurance.</li>
                <li>Regulated activities (quoting, applying for, or purchasing insurance) are available <strong>ONLY</strong> to Ohio residents and <strong>ONLY</strong> for risks located in Ohio.</li>
                <li>Access from outside Ohio is permitted only for non-binding, informational purposes (e.g., general insurance questions or reviewing an existing Ohio-issued policy you already own).</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>3. The Role of &quot;Sam&quot; (Our AI Agent)</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">Sam is an AI-powered insurance assistant that:</p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80 mb-6">
                <li>Reviews the information you provide,</li>
                <li>Recommends appropriate coverage types and limits,</li>
                <li>Retrieves real-time quotes from licensed carriers, and</li>
                <li>Facilitates the application and purchase process.</li>
              </ul>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>CRITICAL AI DISCLOSURES (you acknowledge and agree):</h3>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80 mb-6">
                <li>Sam is an AI-assisted facilitation tool operated under the license of Samurai Insurance. Sam itself is not a separately licensed producer, attorney, accountant, or financial advisor.</li>
                <li>Sam&apos;s recommendations and outputs are generated by artificial intelligence and may contain errors, inaccuracies, or hallucinations.</li>
                <li>In the event of any conflict between anything Sam states and the official policy documents issued by the carrier, the official policy documents control in all circumstances.</li>
                <li>You remain solely responsible for reviewing and confirming that all coverage, limits, exclusions, and premiums meet your needs before accepting a quote.</li>
              </ul>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>Binding Coverage</h3>
              <p className="text-[#333333]/80 leading-relaxed mb-4">Coverage is effective <strong>ONLY</strong> when <strong>ALL</strong> of the following have occurred:</p>
              <ol className="list-decimal pl-6 space-y-2 text-[#333333]/80 mb-4">
                <li>The third-party carrier has formally accepted the risk and issued a policy,</li>
                <li>Payment has been successfully processed, AND</li>
                <li>You have received an official Confirmation of Coverage email containing a policy number and declarations page from the carrier.</li>
              </ol>
              <p className="text-[#333333]/80 leading-relaxed">
                <strong>No statement from Sam (e.g., &quot;You&apos;re covered!&quot;) constitutes binding coverage on its own.</strong>
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>4. User Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>You agree to provide true, accurate, and complete information at all times.</li>
                <li>Material misrepresentation or omission may void coverage and result in claim denial or policy cancellation.</li>
                <li>You are responsible for all activity under your account.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>5. Claims Handling</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">Sam can help collect information and guide you through filing a claim, but:</p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80 mb-4">
                <li>We have no authority to approve, deny, or pay claims.</li>
                <li>All claim decisions are made exclusively by the carrier.</li>
              </ul>
              <div className="bg-[#de5e48]/10 border-l-4 border-[#de5e48] p-4 rounded">
                <p className="text-[#333333] font-semibold mb-2">FOR EMERGENCIES:</p>
                <p className="text-[#333333]/80">
                  Call 911 or appropriate emergency services immediately. For active property loss (fire, flood, break-in, etc.), take reasonable steps to mitigate damage and contact professionals first. Do not delay for Sam.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>6. Fees and Compensation</h2>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li>Using Samurai Insurance and Sam is free to consumers.</li>
                <li>We are compensated by commission from the insurance carrier when a policy is purchased. This commission is included in the premium.</li>
                <li>You may request details of our compensation at any time.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>7. Electronic Signatures and Communications</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                You consent to conduct all transactions electronically. Clicking &quot;I Accept,&quot; &quot;Submit Application,&quot; &quot;Bind Coverage,&quot; or similar constitutes your legally binding electronic signature. All documents will be delivered electronically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>8. Recordings &amp; Privacy</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                All interactions with Sam (chat, voice, and file uploads) are recorded and stored for quality, training, compliance, and dispute-resolution purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>9. Limitation of Liability</h2>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>A. Platform / Technology Claims</h3>
              <p className="text-[#333333]/80 leading-relaxed mb-4">
                For claims arising solely from technical operation of the platform (e.g., downtime, access issues, or non-brokerage errors), our total liability is limited to $500 per user in any 12-month period.
              </p>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>B. Brokerage / Professional Services Claims</h3>
              <p className="text-[#333333]/80 leading-relaxed mb-4">
                Claims arising from our duties as a licensed insurance broker are governed by Ohio insurance law. We maintain professional liability (Errors &amp; Omissions) insurance commensurate with industry standards. Liability for professional negligence shall be determined in accordance with Ohio law and is not capped by the $500 limit in Section 9.A.
              </p>

              <h3 className={`${alteHaasGrotesk.className} text-xl font-semibold text-[#333333] mt-6 mb-3`}>C. General Exclusions</h3>
              <p className="text-[#333333]/80 leading-relaxed">
                In no event shall Samurai Insurance Inc. be liable for indirect, incidental, consequential, special, or punitive damages (including lost profits). We are not responsible for the acts, errors, omissions, insolvency, or claim decisions of any third-party Insurance Carrier.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>10. Arbitration &amp; Class Action Waiver</h2>
              <p className="text-[#333333]/80 leading-relaxed mb-4">
                Any dispute arising out of these Terms or the brokerage services provided by Samurai Insurance shall be resolved by binding arbitration in <strong>Columbus, Ohio</strong> under the rules of the American Arbitration Association.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#333333]/80">
                <li><strong>No Class Actions:</strong> You agree to resolve disputes on an individual basis and waive the right to participate in a class action lawsuit.</li>
                <li><strong>Scope:</strong> This arbitration clause applies to disputes with Samurai Insurance Inc. regarding our services. It does not apply to disputes regarding coverage denials or claims handling by your Insurance Carrier, which are governed by your specific insurance policy.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>11. Termination</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                We may suspend or terminate your account immediately, without notice, for any violation of these Terms or if we believe you are attempting regulated activities from outside Ohio.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>12. Governing Law &amp; Venue</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                These Terms are governed by Ohio law. Any legal action (outside of arbitration) must be brought exclusively in the state or federal courts located in Franklin County, Ohio.
              </p>
            </section>

            <section className="mb-8">
              <h2 className={`${alteHaasGrotesk.className} text-2xl font-bold text-[#333333] mt-8 mb-4`}>13. Changes to Terms</h2>
              <p className="text-[#333333]/80 leading-relaxed">
                We may update these Terms. Material changes will be notified by email or prominent notice, and continued use constitutes acceptance.
              </p>
            </section>

            <section className="mb-8">
              <div className="bg-[#de5e48]/5 border-l-4 border-[#de5e48] p-4 rounded">
                <p className="text-[#333333]/80">
                  Questions? Contact <a href="mailto:info@joinsamurai.com" className="text-[#de5e48] hover:underline">info@joinsamurai.com</a>
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
