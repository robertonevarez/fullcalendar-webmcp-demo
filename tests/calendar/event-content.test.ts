import { describe, expect, it } from "vitest";
import { splitEnterpriseTitle } from "@/calendar/CalendarEventContent";

describe("splitEnterpriseTitle", () => {
  it("splits Name — Place titles", () => {
    expect(splitEnterpriseTitle("Equipment Inspection — Building 4")).toEqual({
      headline: "Equipment Inspection",
      place: "Building 4",
    });
  });

  it("returns the full title when no separator is present", () => {
    expect(splitEnterpriseTitle("Company Planning Day")).toEqual({
      headline: "Company Planning Day",
    });
  });
});
