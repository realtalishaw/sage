
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import Footer from '../components/Footer';

const Privacy: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-8 max-w-[1040px] mx-auto w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="font-bold text-xl tracking-tighter">GIA</span>
        </Link>
        <Link to="/activate">
          <Button variant="primary" size="sm" className="rounded-full px-5">Get started</Button>
        </Link>
      </header>

      <main className="flex-1 max-w-[800px] mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold mb-12 tracking-tight">Privacy Policy</h1>
        
        <div className="space-y-10 text-white/60 leading-relaxed text-[17px]">
          <section>
            <h2 className="text-white text-xl font-bold mb-4">Introduction</h2>
            <p>
              Your privacy is fundamental to GIA (General Intelligence Agency). We believe that your data belongs to you, and our role is to act as a secure steward of your professional intelligence. This policy outlines how we handle data during our Private Alpha phase.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-4">Data Collection</h2>
            <p>
              GIA connects to your professional tools (Google Workspace, Slack, Notion, etc.) to learn your workflows. We only access the scopes you explicitly authorize. During the alpha, we store temporary representations of your activity to train the GIA agent specifically for your context.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-4">Security</h2>
            <p>
              We use industry-standard encryption for all data at rest and in transit. Your credentials for integrated apps are stored in secure vaults and never exposed to the GIA core logic directly.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-4">Your Rights</h2>
            <p>
              You can disconnect any integration at any time from the Settings dashboard. Upon request, we will permanently delete all indexed data associated with your account.
            </p>
          </section>

          <section className="pt-10 border-t border-white/5">
            <p className="text-sm">
              Last updated: October 20, 2025. Contact <a href="mailto:privacy@generalintelligence.agency" className="text-white underline">privacy@generalintelligence.agency</a> for inquiries.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
