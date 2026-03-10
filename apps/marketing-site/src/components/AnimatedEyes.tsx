import { useEffect, useState } from "react";

interface AnimatedEyesProps {
  className?: string;
}

export function AnimatedEyes({ className = "" }: AnimatedEyesProps) {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = Math.max(0, Math.min(1, e.clientX / window.innerWidth));
      const y = Math.max(0, Math.min(1, e.clientY / window.innerHeight));
      setMousePos({ x, y });
    };

    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const x = Math.max(0, Math.min(1, touch.clientX / window.innerWidth));
        const y = Math.max(0, Math.min(1, touch.clientY / window.innerHeight));
        setMousePos({ x, y });
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleTouch);
    };
  }, []);

  // Map 0-1 to pupil offset: center at 0.5, range roughly -8px to 8px
  const pupilOffsetX = (mousePos.x - 0.5) * 16;
  const pupilOffsetY = (mousePos.y - 0.5) * 12;

  return (
    <div className={`flex items-center justify-center gap-6 ${className}`.trim()}>
      <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/20 bg-[#141414]">
        {/*
          The eye shell needs to be fully opaque so transcript text cannot show
          through the fixed eye area while the conversation scrolls underneath.
        */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${pupilOffsetX}px, ${pupilOffsetY}px)`,
            transition: "transform 0.1s ease-out",
          }}
        >
          <div className="h-4 w-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
        </div>
      </div>
      <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/20 bg-[#141414]">
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${pupilOffsetX}px, ${pupilOffsetY}px)`,
            transition: "transform 0.1s ease-out",
          }}
        >
          <div className="h-4 w-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
        </div>
      </div>
    </div>
  );
}
