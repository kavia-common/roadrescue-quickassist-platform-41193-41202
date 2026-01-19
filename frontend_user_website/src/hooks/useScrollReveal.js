import { useEffect } from "react";

/**
 * Returns whether the user has requested reduced motion.
 * Kept as a small helper so we can avoid creating observers when motion is reduced.
 */
function getPrefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Reveal elements as they enter the viewport by applying a `data-reveal="in"` attribute.
 *
 * Usage:
 * - Add `data-reveal` to any element you want animated.
 * - Optionally add `data-reveal-variant="up|down|left|right"` to slightly vary the entrance.
 *
 * This is UI-only and uses IntersectionObserver for performance.
 */
// PUBLIC_INTERFACE
export function useScrollReveal(options = {}) {
  /** Attaches an IntersectionObserver that sets data-reveal="in" on elements with [data-reveal]. */
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // Respect reduced motion: reveal immediately without transitions.
    if (getPrefersReducedMotion()) {
      const nodes = document.querySelectorAll("[data-reveal]");
      nodes.forEach((n) => {
        n.setAttribute("data-reveal", "in");
      });
      return;
    }

    const {
      root = null,
      rootMargin = "0px 0px -10% 0px",
      threshold = 0.15,
      once = true,
    } = options;

    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target;
          el.setAttribute("data-reveal", "in");

          if (once) observer.unobserve(el);
        });
      },
      { root, rootMargin, threshold }
    );

    nodes.forEach((n) => observer.observe(n));

    return () => observer.disconnect();
  }, [options]);
}
