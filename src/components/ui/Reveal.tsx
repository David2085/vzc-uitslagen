"use client";

import { useEffect, useRef, useState } from "react";

// Lichtgewicht scroll-reveal (CSS-motion, geen framer-motion).
// Voegt .is-in toe zodra het element in beeld komt; respecteert
// prefers-reduced-motion via de CSS in globals.css.
export default function Reveal({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "-60px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  const Comp = Tag as "div";
  return (
    <Comp
      ref={ref as React.Ref<HTMLDivElement>}
      className={`reveal ${seen ? "is-in" : ""} ${className}`}
    >
      {children}
    </Comp>
  );
}
