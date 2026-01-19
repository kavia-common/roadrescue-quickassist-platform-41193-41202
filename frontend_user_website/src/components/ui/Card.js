import React from "react";

// PUBLIC_INTERFACE
export function Card({ title, subtitle, children, actions, footer, className, style }) {
  /**
   * Card container for forms, lists, and marketing sections.
   *
   * Props:
   * - title?: string
   * - subtitle?: string
   * - actions?: ReactNode (right side of header)
   * - footer?: ReactNode (optional footer region)
   * - className?: string
   */
  return (
    <section className={["card card-hover", className].filter(Boolean).join(" ")} style={style}>
      {(title || subtitle || actions) && (
        <div className="card-header">
          <div>
            {title ? <h2 className="card-title">{title}</h2> : null}
            {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="card-actions">{actions}</div> : null}
        </div>
      )}

      <div className="card-body">{children}</div>

      {footer ? <div className="card-footer">{footer}</div> : null}
    </section>
  );
}
