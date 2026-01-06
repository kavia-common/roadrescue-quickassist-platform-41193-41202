import React from "react";

// PUBLIC_INTERFACE
export function Footer() {
  /** Simple footer with theme styling. */
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>© {new Date().getFullYear()} RoadRescue – QuickAssist</div>
        <div className="footer-muted">Ocean Professional theme • Mock/Supabase data layer</div>
      </div>
    </footer>
  );
}
