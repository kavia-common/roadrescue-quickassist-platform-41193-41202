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
 * Applies subtle, index-based stagger delays to children of containers marked with:
 * - data-reveal-stagger
 *
 * Each direct child receives a CSS variable (--reveal-delay) that CSS consumes via transition-delay.
 * This keeps the behavior UI-only, low-cost, and easy to tweak in CSS.
 */
function applyStaggerDelays(root = document) {
  const containers = Array.from(root.querySelectorAll("[data-reveal-stagger]"));

  containers.forEach((container) => {
    const stepMsRaw = container.getAttribute("data-reveal-stagger-step");
    const stepMs = Number.isFinite(Number(stepMsRaw)) ? Number(stepMsRaw) : 55;

    const children = Array.from(container.children).filter(
      (el) => el && el.nodeType === 1 && !el.hasAttribute("data-reveal-stagger-ignore")
    );

    children.forEach((child, idx) => {
      child.style.setProperty("--reveal-delay", `${idx * stepMs}ms`);
    });
  });
}

/**
 * Reveal elements as they enter the viewport by applying a `data-reveal="in"` attribute.
 *
 * Usage:
 * - Add `data-reveal` to any element you want animated.
 * - Optionally add `data-reveal-variant="up|down|left|right"` to slightly vary the entrance.
 * - Add `data-reveal-stagger` to a container to stagger its direct children.
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

    // Compute stagger delays once per mount (and re-run if options changes).
    applyStaggerDelays(document);

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
