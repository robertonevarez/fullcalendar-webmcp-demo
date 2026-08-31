import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "temporal-polyfill/global";
import { CalendarApp } from "@/calendar/CalendarApp";

describe("CalendarApp", () => {
  it("renders FullCalendar in month view with seeded enterprise events", async () => {
    render(<CalendarApp />);

    expect(screen.getByTestId("calendar-surface")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    const monthButton = screen.getByRole("tab", { name: /month view/i });
    expect(monthButton).toHaveAttribute("aria-selected", "true");

    await waitFor(() => {
      expect(screen.getByText("Site Survey — North Campus")).toBeInTheDocument();
      expect(screen.getByText("Deployment — Regional Office")).toBeInTheDocument();
    });
  });
});
