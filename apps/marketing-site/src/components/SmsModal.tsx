import { useEffect } from "react";
import { X } from "lucide-react";
import QRCode from "qrcode";

interface SmsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SmsModal({ isOpen, onClose }: SmsModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const smsLink = "sms:+12052434811&body=add%20me%20%F0%9F%98%89";

    QRCode.toCanvas(canvas, smsLink, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    }).catch((err) => {
      console.error("Failed to generate QR code:", err);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-3xl border border-white/10 bg-[#1c1c1e] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold lowercase text-white">join sage</h2>
          <p className="mb-6 text-sm text-white/70 lowercase">
            scan this qr code with your phone to text sage
          </p>

          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-white p-4">
              <canvas id="qr-canvas" />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
              or text manually
            </p>
            <p className="mt-2 text-lg font-medium text-white lowercase">
              text "add me 😉" to
            </p>
            <p className="mt-1 text-2xl font-bold text-white">+1 (205) 243-4811</p>
          </div>
        </div>
      </div>
    </div>
  );
}
