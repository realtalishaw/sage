
import React from 'react';
import { Download } from 'lucide-react';
import { Button } from './Button';

interface AgentCardProps {
  email: string;
  phone: string;
  id: string;
  name: string;
}

export const AgentCard: React.FC<AgentCardProps> = ({ email, phone, id, name }) => {

  const handleDownloadVCard = () => {
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL:${phone}
EMAIL:${email}
END:VCARD`;
    const blob = new Blob([vCard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full flex-1 min-h-0 bg-[#212121] border border-white/5 rounded-[20px] overflow-hidden shadow-lg flex flex-col">
      {/* Background Watermark G - centered in container */}
      <div className="absolute inset-0 flex items-start justify-end p-4 select-none pointer-events-none">
        <span className="text-[min(120px,30vw)] font-black leading-none text-white opacity-[0.06]">G</span>
      </div>

      {/* Content - fills and centers */}
      <div className="relative z-10 flex-1 flex flex-col justify-center p-5 min-h-0 overflow-auto">
        <div className="space-y-4">
          {/* Header Label */}
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Agent Identity</p>

          {/* Agent Info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[16px] bg-white flex items-center justify-center text-[#0B0B0C] text-xl font-black shadow-lg flex-shrink-0">
              G.
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-white/90 leading-tight truncate">{name}</p>
              <p className="text-[11px] font-mono text-white/40 tracking-wide mt-0.5">ID: {id}</p>
            </div>
          </div>

          {/* Contact Fields */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 h-12 px-4 bg-[#0B0B0C]/60 border border-white/5 rounded-[14px]">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex-shrink-0">Agency Email</span>
              <span className="text-sm font-medium text-white/90 truncate">{email}</span>
            </div>
            <div className="flex items-center justify-between gap-3 h-12 px-4 bg-[#0B0B0C]/60 border border-white/5 rounded-[14px]">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex-shrink-0">Direct Line</span>
              <span className="text-sm font-medium text-white/90">{phone}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <Button 
              variant="secondary" 
              className="flex-1 h-12 rounded-[14px] !bg-white/5 !border-white/10 hover:!bg-white/10 text-sm font-semibold"
            >
              Add to Contacts
            </Button>
            <button 
              onClick={handleDownloadVCard}
              className="w-12 h-12 flex items-center justify-center rounded-[14px] bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
