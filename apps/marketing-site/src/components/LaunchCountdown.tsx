import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function LaunchCountdown() {
  // March 17, 2026 @ 12:00pm EST (convert to UTC)
  const launchDate = new Date("2026-03-17T17:00:00.000Z"); // 12:00pm EST = 5:00pm UTC

  const calculateTimeLeft = (): TimeLeft => {
    const difference = launchDate.getTime() - new Date().getTime();

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
        launch countdown
      </p>
      <div className="grid grid-cols-4 gap-3">
        {[
          { value: timeLeft.days, label: "days" },
          { value: timeLeft.hours, label: "hrs" },
          { value: timeLeft.minutes, label: "min" },
          { value: timeLeft.seconds, label: "sec" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <div className="text-2xl font-bold tabular-nums text-white">
              {item.value.toString().padStart(2, "0")}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-white/50">
              {item.label}
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-white/40">
        march 17, 2026 • 12:00pm est
      </p>
    </div>
  );
}
