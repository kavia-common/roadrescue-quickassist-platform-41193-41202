import { render, screen } from "@testing-library/react";
import App from "./App";

// React-Leaflet is shipped as ESM, which CRA/Jest doesn't transform by default.
// The app imports LocationMap in pages, so we mock it for unit tests that only
// validate basic rendering.
jest.mock("./components/LocationMap", () => ({
  __esModule: true,
  LocationMap: () => null,
}));

test("renders brand name", () => {
  render(<App />);
  // Brand is a link in the navbar; avoid matching footer text too.
  const brandLink = screen.getByRole("link", { name: /RoadRescue/i });
  expect(brandLink).toBeInTheDocument();
});
