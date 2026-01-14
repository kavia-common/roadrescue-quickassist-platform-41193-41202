import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders brand name", () => {
  render(<App />);
  // Brand is a link in the navbar; avoid matching footer text too.
  const brandLink = screen.getByRole("link", { name: /RoadRescue/i });
  expect(brandLink).toBeInTheDocument();
});
