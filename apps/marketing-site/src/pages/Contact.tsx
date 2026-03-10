import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import LandingFooter from "../components/LandingFooter";
import { setPageTitle } from "../lib/seo";

export default function Contact() {
  useEffect(() => {
    /*
      Like the media page, this route turns a footer-only email target into a
      first-class page with its own title and direct navigation path.
    */
    window.scrollTo(0, 0);
    setPageTitle("Contact");
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

      <main className="mx-auto flex min-h-screen max-w-[800px] items-center px-6 pb-20 pt-32">
        <div className="w-full">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-white/50">
            Contact
          </p>
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">Get in touch</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-white/70">
            If you have product questions, partnership ideas, support issues, or anything else you
            need from the team, send us a note and we will route it to the right person.
          </p>

          <div className="mt-10 rounded-[28px] border border-white/10 bg-white/5 p-8">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/40">
              General Inbox
            </p>
            <a
              href="mailto:sage@joinsage.xyz"
              className="mt-4 inline-block text-2xl font-semibold text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
            >
              sage@joinsage.xyz
            </a>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/60">
              Include context about what you are trying to do so we can respond with the right next
              step faster.
            </p>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
