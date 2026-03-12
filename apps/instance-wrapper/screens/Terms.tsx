
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import Footer from '../components/Footer';

const Terms: React.FC = () => {
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
        <h1 className="text-5xl font-bold mb-12 tracking-tight">Terms of Service</h1>
        
        <div className="space-y-10 text-white/60 leading-relaxed text-[17px]">
          <section>
            <h2 className="text-white text-xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing the GIA Private Alpha, you agree to be bound by these Terms of Service and all applicable laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-4">2. Alpha Participation</h2>
            <p>
              GIA is currently in a Private Alpha stage. The service is provided "as is" and may contain bugs or incomplete features. Your feedback is instrumental in our development, but the service stability is not guaranteed.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-4">3. User Conduct</h2>
            <p>
              You are responsible for the data you connect to GIA. You must not use the agency for any illegal activities or to process data you do not have the rights to.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-4">4. Limitation of Liability</h2>
            <p>
              In no event shall GIA be liable for any damages arising out of the use or inability to use the alpha service.
            </p>
          </section>

          <section className="pt-10 border-t border-white/5">
            <p className="text-sm">
              Last updated: October 20, 2025.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
