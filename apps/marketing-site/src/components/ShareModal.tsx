import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Linkedin, Mail, MessageSquare, Share2, X } from "lucide-react";
import { Button } from "./Button";

const shareText = "use my sage invite link to move me up the line.";
const shareTitle = "join sage";

interface ShareModalProps {
  link: string;
  shareText?: string;
  shareTitle?: string;
  triggerClassName?: string;
  onCopySuccess?: () => void;
  onCopyError?: (err: unknown) => void;
}

function buildTwitterUrl(link: string, text: string) {
  const fullText = `${text} ${link}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;
}

function buildLinkedInUrl(link: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
}

function buildEmailUrl(link: string, title: string, text: string) {
  const body = `${text}\n\n${link}`;
  return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

function buildTextUrl(link: string, text: string) {
  const body = `${text} ${link}`;
  return `sms:&body=${encodeURIComponent(body)}`;
}

export function ShareModal({
  link,
  shareText: customShareText = shareText,
  shareTitle: customShareTitle = shareTitle,
  triggerClassName = "",
  onCopySuccess,
  onCopyError,
}: ShareModalProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    /*
      Locking body scroll makes the share card behave like a true modal and
      prevents the underlying success page from continuing to feel interactive.
    */
    if (!open || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  /*
    The action list is data-driven so the large tile layout stays easy to tweak
    without duplicating button markup four times.
  */
  const shareOptions = [
    {
      label: "x",
      icon: <span className="text-[1.75rem] font-semibold leading-none">x</span>,
      onClick: () => handleShareTo(buildTwitterUrl(link, customShareText)),
      ariaLabel: "share to x",
    },
    {
      label: "linkedin",
      icon: <Linkedin className="h-7 w-7" strokeWidth={1.8} />,
      onClick: () => handleShareTo(buildLinkedInUrl(link)),
      ariaLabel: "share to linkedin",
    },
    {
      label: "email",
      icon: <Mail className="h-7 w-7" strokeWidth={1.8} />,
      onClick: () => handleShareTo(buildEmailUrl(link, customShareTitle, customShareText)),
      ariaLabel: "share via email",
    },
    {
      label: "text",
      icon: <MessageSquare className="h-7 w-7" strokeWidth={1.8} />,
      onClick: () => {
        window.location.href = buildTextUrl(link, customShareText);
      },
      ariaLabel: "share via text",
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      onCopySuccess?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      onCopyError?.(err);
    }
  };

  const handleShareTo = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  /*
    Rendering the dialog through a portal keeps it out of the surrounding page
    grid and transform contexts, which prevents the "stretched / see-through"
    behavior visible when the overlay is mounted inline.
  */
  const modalContent =
    open && typeof document !== "undefined" ? (
      <div
        className="fixed inset-0 z-[120]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <div className="absolute inset-0 bg-black/90 backdrop-blur-[4px]" onClick={() => setOpen(false)} />

        {/*
          This modal follows the reference structure: centered headline block,
          prominent link row, divider, four share tiles, and a bottom reward band.
          The typography remains lowercase and the palette stays inside Sage's
          existing dark/burnished-brown visual language.
        */}
        <div className="absolute left-1/2 top-1/2 z-10 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0B0B0C] shadow-[0_40px_120px_rgba(0,0,0,0.72)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.03)_0%,_transparent_42%)]" />

          <div className="relative px-6 pb-8 pt-6 sm:px-10 sm:pb-10 sm:pt-8">
            <div className="mb-4 flex justify-end sm:mb-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
                aria-label="close"
              >
                <X className="h-6 w-6" strokeWidth={1.7} />
              </button>
            </div>

            <div className="mx-auto text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                <img
                  src="/favicon.svg"
                  alt="sage"
                  className="h-10 w-10"
                />
              </div>

              <h2
                id="share-modal-title"
                className="text-2xl font-semibold tracking-tight text-white sm:text-[2.5rem]"
              >
                share with friends
              </h2>
              <p className="mx-auto mt-4 text-base leading-7 text-white sm:text-lg sm:leading-8">
                invite your friends to sage and jump ahead in the waitlist together.
              </p>
            </div>

            <div className="mx-auto mt-10">
              <p className="mb-3 text-left text-sm font-semibold tracking-tight text-white/95">
                your unique referral link
              </p>
              <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  readOnly
                  value={link}
                  className="min-w-0 flex-1 truncate border-0 bg-transparent px-3 py-2 text-[15px] leading-6 text-white/95 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white/5 px-5 py-2.5 text-sm font-semibold tracking-tight text-white/90 transition hover:bg-white/10"
                  aria-label={copied ? "copied" : "copy link"}
                  title={copied ? "copied" : "copy link"}
                >
                  <Copy className="h-4 w-4" strokeWidth={1.8} />
                  {copied ? "copied" : "copy"}
                </button>
              </div>
            </div>

            <div className="mx-auto mt-10 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                or share via
              </p>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="mx-auto mt-8 flex items-center justify-center gap-8">
              {shareOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={option.onClick}
                  className="group flex flex-col items-center gap-3 text-center transition-transform hover:-translate-y-1"
                  aria-label={option.ariaLabel}
                >
                  <div className="text-white/70 transition-colors hover:text-white">
                    {option.icon}
                  </div>
                  <span className="text-xs tracking-tight text-white/70">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[0.03] px-6 py-5 sm:px-10">
            <p className="text-center text-sm font-medium tracking-tight text-white/95">
              jump 10 spots for every friend who joins
            </p>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <Button
        variant="secondary"
        className={`h-11 shrink-0 border-white/10 bg-white/5 px-5 text-white/80 ${triggerClassName}`.trim()}
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex items-center gap-2">
          <Share2 className="h-4 w-4" strokeWidth={1.8} />
          share
        </span>
      </Button>
      {modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
