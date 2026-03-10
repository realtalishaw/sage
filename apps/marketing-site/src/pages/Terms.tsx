import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import LandingFooter from "../components/LandingFooter";
import { setPageTitle } from "../lib/seo";

export default function Terms() {
  useEffect(() => {
    /*
      Matching the older web app's content is not enough on its own; we also
      set the browser title so the page has the expected legal-page metadata.
    */
    window.scrollTo(0, 0);
    setPageTitle("Terms of Service");
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[rgba(255,255,255,0.92)]">
      <header className="fixed left-0 right-0 top-0 z-50 px-6 py-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent opacity-100" />
        <div className="relative mx-auto flex w-full max-w-[1040px] items-center justify-between lowercase">
          <Link to="/" className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tighter">sage 🌱</span>
          </Link>
          <Link to="/activate">
            <Button variant="primary" size="sm" className="rounded-full px-6">
              get started
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[800px] px-6 pb-20 pt-32">
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Terms of Service</h1>
        <p className="mb-12 text-sm text-white/50">Last updated: March 5, 2026</p>

        <div className="space-y-8 leading-relaxed text-white/80">
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Agreement to Terms</h2>
            <p>
              By accessing or using Sage, you agree to be bound by these Terms of Service. If you
              do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Description of Service</h2>
            <p>
              Sage is an AI-powered assistant service that helps you delegate tasks, automate
              workflows, and scale your work through text-based interactions. The service includes
              access to AI capabilities, integrations, and related features.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">User Accounts</h2>
            <h3 className="mb-2 text-lg font-semibold text-white/90">Account Creation</h3>
            <p className="mb-4">
              To use certain features of our service, you must create an account. You agree to:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>

            <h3 className="mb-2 text-lg font-semibold text-white/90">Account Eligibility</h3>
            <p>
              You must be at least 13 years old to use Sage. By using our service, you represent
              that you meet this requirement.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Acceptable Use</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Use the service for any illegal purpose or in violation of any laws</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Use the service to transmit malware or harmful code</li>
              <li>Impersonate others or provide false information</li>
              <li>Scrape, spider, or harvest information from the service</li>
              <li>Use the service to harass, abuse, or harm others</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Intellectual Property</h2>
            <p className="mb-4">
              The service and its original content, features, and functionality are owned by Sage
              and are protected by international copyright, trademark, and other intellectual
              property laws.
            </p>
            <p>
              You retain ownership of any content you provide to the service. By using Sage, you
              grant us a license to use, store, and process your content to provide and improve our
              services.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Payment and Billing</h2>
            <h3 className="mb-2 text-lg font-semibold text-white/90">Fees</h3>
            <p className="mb-4">
              Certain features of Sage require payment. You agree to pay all applicable fees as
              described at the time of purchase.
            </p>

            <h3 className="mb-2 text-lg font-semibold text-white/90">Subscriptions</h3>
            <p className="mb-4">
              Subscription fees are billed in advance on a recurring basis. You may cancel your
              subscription at any time, but no refunds will be provided for partial periods.
            </p>

            <h3 className="mb-2 text-lg font-semibold text-white/90">Price Changes</h3>
            <p>
              We may adjust pricing with reasonable notice. Continued use of the service after a
              price change constitutes acceptance of the new pricing.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Disclaimers</h2>
            <p className="mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED.
            </p>
            <p>
              We do not guarantee that the service will be uninterrupted, secure, or error-free. We
              are not responsible for any decisions made based on information provided by Sage.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SAGE SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR
              REVENUES.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your access to the service immediately, without prior
              notice, for any reason, including breach of these terms.
            </p>
            <p>
              Upon termination, your right to use the service will cease immediately. All
              provisions that should reasonably survive termination will survive.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will provide notice of
              material changes. Your continued use of the service after changes constitutes
              acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of the
              United States, without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us at:{" "}
              <a href="mailto:sage@joinsage.xyz" className="text-white underline hover:text-white/80">
                sage@joinsage.xyz
              </a>
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
