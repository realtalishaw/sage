import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import LandingFooter from "../components/LandingFooter";
import { setPageTitle } from "../lib/seo";

export default function Feedback() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    /*
      These public utility pages should always reset scroll position and title
      because users often arrive from footer links deep in the home page.
    */
    window.scrollTo(0, 0);
    setPageTitle("Feedback");
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    /*
      The original web page only simulated submission. We keep that behavior for
      now so the page can ship visually without pretending there is a backend.
    */
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitted(true);
    setIsSubmitting(false);
    setEmail("");
    setFeedback("");

    window.setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[rgba(255,255,255,0.92)] lowercase">
      <header className="fixed left-0 right-0 top-0 z-50 px-6 py-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent opacity-100" />
        <div className="relative mx-auto flex w-full max-w-[1040px] items-center justify-between">
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

      <main className="flex min-h-screen items-center justify-center px-6 pb-16 pt-32">
        <div className="w-full max-w-[600px]">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              we'd love your feedback
            </h1>
            <p className="text-lg text-white/60">
              help us improve sage by sharing your thoughts, ideas, or issues.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/70">
                your email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-base text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-0"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label htmlFor="feedback" className="mb-2 block text-sm font-medium text-white/70">
                your feedback
              </label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                required
                rows={8}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-base text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-0"
                placeholder="share your thoughts, suggestions, or report an issue..."
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full rounded-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "sending..." : "send feedback"}
            </Button>

            {isSubmitted && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-4 text-center text-sm font-medium text-emerald-400">
                thanks for your feedback! we'll be in touch soon.
              </div>
            )}
          </form>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
