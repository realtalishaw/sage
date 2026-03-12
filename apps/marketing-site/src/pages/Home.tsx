import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { setPageTitle } from "../lib/seo";
import { Button } from "../components/Button";
import { SmsModal } from "../components/SmsModal";
import LandingShowcase from "../components/LandingShowcase";
import LandingFooter from "../components/LandingFooter";

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);

  useEffect(() => {
    setPageTitle("Your AI co-founder");
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  const handleGetStarted = (e: React.MouseEvent) => {
    e.preventDefault();

    if (isMobile()) {
      window.location.href = "sms:+12052434811&body=add%20me%20%F0%9F%98%89";
    } else {
      setShowSmsModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[rgba(255,255,255,0.92)] selection:bg-white/20 lowercase">
      <SmsModal isOpen={showSmsModal} onClose={() => setShowSmsModal(false)} />

      <header className="fixed left-0 right-0 top-0 z-50 px-6 py-8">
        <div
          className={`pointer-events-none absolute inset-0 transition-all duration-500 ${
            isScrolled
              ? "bg-gradient-to-b from-black/75 via-black/55 to-black/0 opacity-100 backdrop-blur-md"
              : "opacity-0"
          }`}
        />
        <div className="relative mx-auto flex w-full max-w-[1040px] items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tighter">sage 🌱</span>
          </Link>
          <Button
            variant="primary"
            size="sm"
            className="rounded-full px-6"
            onClick={handleGetStarted}
          >
            get started
          </Button>
        </div>
      </header>

      <main className="min-h-screen pt-24">
        <section
          className="relative z-20 mx-auto flex max-w-[1100px] flex-col items-center justify-center px-6 pb-16 text-center"
          style={{ minHeight: "calc(100vh - 350px)" }}
        >
          <h1 className="mb-8 max-w-[900px] text-[44px] font-[650] leading-[1.05] tracking-[-0.04em] md:text-[72px]">
            your ai co-founder who gets things done.
          </h1>
          <p className="mx-auto mb-10 max-w-[900px] text-[18px] font-medium leading-relaxed text-white/50 md:text-[21px]">
            text sage to delegate tasks, make connections, and build faster.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-12">
            <Button
              variant="primary"
              size="md"
              className="rounded-full px-10"
              data-landing-cta="true"
              onClick={handleGetStarted}
            >
              get started
            </Button>
          </div>
        </section>

        <LandingShowcase />
      </main>

      <LandingFooter />
    </div>
  );
}
