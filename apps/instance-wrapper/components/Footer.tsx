
import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="relative z-40 px-10 py-20 max-w-[1440px] mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
        {/* Brand & Copyright */}
        <div className="space-y-4">
          <div className="font-bold text-xl tracking-tighter text-white">Sage</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/20 leading-loose">
            General Intelligence Agency<br/>
            © 2025
          </div>
        </div>

        {/* Follow Us */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Follow Us</h4>
          <ul className="space-y-3">
            <li>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-white/50 hover:text-white transition-colors">X (Twitter)</a>
            </li>
            <li>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-white/50 hover:text-white transition-colors">Discord</a>
            </li>
          </ul>
        </div>

        {/* Company */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Company</h4>
          <ul className="space-y-3">
            <li>
              <Link to="/feedback" className="text-[13px] font-medium text-white/50 hover:text-white transition-colors">Feedback</Link>
            </li>
            <li>
              <a href="mailto:contact@generalintelligence.agency" className="text-[13px] font-medium text-white/50 hover:text-white transition-colors truncate block">contact@generalintelligence.agency</a>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Legal</h4>
          <ul className="space-y-3">
            <li>
              <Link to="/privacy" className="text-[13px] font-medium text-white/50 hover:text-white transition-colors">Privacy Policy</Link>
            </li>
            <li>
              <Link to="/terms" className="text-[13px] font-medium text-white/50 hover:text-white transition-colors">Terms of Service</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
