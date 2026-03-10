import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function LandingFooter() {
  return (
    /*
      The footer is the navigation surface for low-intent pages like feedback,
      legal, and contact. These links should resolve to real routes so the
      marketing site can be crawled and shared cleanly.
    */
    <footer className="relative z-40 mx-auto w-full max-w-[1440px] px-10 py-20">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-5 md:gap-8">
        <div className="space-y-4 md:col-span-2">
          <div className="text-xl font-bold tracking-tighter text-white">sage 🌱</div>
          <p className="text-[13px] font-medium leading-relaxed text-white/50">
            text to delegate, automate, and scale your work.
          </p>
          <div className="text-[11px] font-bold tracking-[0.2em] text-white/20">
            © 2026
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-bold tracking-[0.2em] text-white">FOLLOW US</h4>
          <ul className="space-y-3">
            <li>
              <a
                href="https://x.com/joinsagexyz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
              >
                x (twitter)
                <ArrowUpRight size={14} className="opacity-50" />
              </a>
            </li>
            <li>
              <a
                href="https://linkedin.com/company/joinsage"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[13px] font-medium text-white/50 transition-colors hover:text-white"
              >
                linkedin
                <ArrowUpRight size={14} className="opacity-50" />
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-bold tracking-[0.2em] text-white">COMPANY</h4>
          <ul className="space-y-3">
            <li>
              <Link
                to="/feedback"
                className="text-[13px] font-medium text-white/50 transition-colors hover:text-white"
              >
                feedback
              </Link>
            </li>
            <li>
              <a
                href="mailto:press@joinsage.xyz"
                className="text-[13px] font-medium text-white/50 transition-colors hover:text-white"
              >
                media inquiries
              </a>
            </li>
            <li>
              <a
                href="mailto:sage@joinsage.xyz"
                className="text-[13px] font-medium text-white/50 transition-colors hover:text-white"
              >
                contact us
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-bold tracking-[0.2em] text-white">RESOURCES</h4>
          <ul className="space-y-3">
            <li>
              <Link
                to="/privacy"
                className="text-[13px] font-medium text-white/50 transition-colors hover:text-white"
              >
                privacy policy
              </Link>
            </li>
            <li>
              <Link
                to="/terms"
                className="text-[13px] font-medium text-white/50 transition-colors hover:text-white"
              >
                terms of service
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
