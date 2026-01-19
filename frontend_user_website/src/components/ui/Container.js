import React from "react";

// PUBLIC_INTERFACE
export function Container({ children }) {
  /** Standard content width wrapper. */
  return <div className="container">{children}</div>;
}
