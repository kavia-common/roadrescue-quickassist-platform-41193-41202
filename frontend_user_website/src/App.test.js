import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders brand name", () => {
  render(<App />);
  const brandLink = screen.getByRole("link", { name: /RoadRescue/i });
  expect(brandLink).toBeInTheDocument();
});
