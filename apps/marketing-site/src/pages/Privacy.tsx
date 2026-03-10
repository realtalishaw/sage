import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import LandingFooter from "../components/LandingFooter";
import { setPageTitle } from "../lib/seo";

export default function Privacy() {
  useEffect(() => {
    /*
      The legal pages should set a deterministic title and scroll position so
      shared links and browser navigation behave like independent pages.
    */
    window.scrollTo(0, 0);
    setPageTitle("Privacy Policy");
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
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Privacy Policy</h1>
        <p className="mb-12 text-sm text-white/50">Last updated: March 5, 2026</p>

        <div className="space-y-8 leading-relaxed text-white/80">
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Introduction</h2>
            <p>
              Sage ("we," "our," or "us") is committed to protecting your privacy. This
              Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our AI assistant service.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Information We Collect</h2>
            <h3 className="mb-2 text-lg font-semibold text-white/90">Personal Information</h3>
            <p className="mb-4">We collect information that you provide directly to us, including:</p>
            <ul className="mb-4 list-disc space-y-2 pl-6">
              <li>Name and contact information (email, phone number)</li>
              <li>Account credentials</li>
              <li>Messages and communications with Sage</li>
              <li>Payment information (processed securely through third-party providers)</li>
            </ul>

            <h3 className="mb-2 text-lg font-semibold text-white/90">
              Automatically Collected Information
            </h3>
            <p className="mb-4">When you use our service, we automatically collect:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Usage data and interaction patterns</li>
              <li>Device information and identifiers</li>
              <li>Log data and technical information</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">How We Use Your Information</h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your requests and transactions</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Develop new features and functionality</li>
              <li>Ensure the security and integrity of our service</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Data Sharing and Disclosure</h2>
            <p className="mb-4">
              We do not sell your personal information. We may share your information in the
              following circumstances:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>With service providers who assist in our operations</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With your consent or at your direction</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your
              information. However, no method of transmission over the internet is 100% secure,
              and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Data Retention</h2>
            <p>
              We retain your information for as long as necessary to provide our services and
              fulfill the purposes outlined in this policy, unless a longer retention period is
              required by law.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Access and receive a copy of your personal information</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your information</li>
              <li>Object to or restrict certain processing</li>
              <li>Withdraw consent where applicable</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Children's Privacy</h2>
            <p>
              Our service is not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-white">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:{" "}
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
