import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders brand name", () => {
  render(<App />);
  expect(screen.getByText(/RoadRescue/i)).toBeInTheDocument();
});
