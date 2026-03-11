import { useEffect } from "react";
import { Link } from "react-router-dom";
import { setPageTitle } from "../lib/seo";
import { Button } from "../components/Button";

export default function NotFound() {
  useEffect(() => {
    setPageTitle("404");
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0B0C] px-6">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute left-[20%] top-[15%] h-96 w-96 rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute right-[15%] top-[25%] h-80 w-80 rounded-full bg-white/[0.025] blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center lowercase">
        <div className="mb-8">
          <div className="mb-4 text-[180px] font-bold leading-none tracking-tight text-white/10 md:text-[240px]">
            404
          </div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            you're not supposed to be here
          </h1>
          <p className="mx-auto max-w-md text-base text-white/60 md:text-lg">
            this page wandered off. or maybe you did. either way, let's get you back on track.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link to="/">
            <Button variant="primary" size="lg" className="min-w-[200px]">
              take me home
            </Button>
          </Link>
          <Link to="/apply">
            <Button variant="secondary" size="lg" className="min-w-[200px] border-white/10 bg-white/5 text-white/80">
              join waitlist
            </Button>
          </Link>
        </div>

        <div className="mt-12 text-xs text-white/40">
          <p>lost? confused? that's the vibe.</p>
        </div>
      </div>
    </div>
  );
}
