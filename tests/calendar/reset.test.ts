import { describe, expect, it } from "vitest";
import { shouldResetFromSearch, stripResetParam } from "@/calendar/reset";

describe("reset query helpers", () => {
  it("detects ?reset=1", () => {
    expect(shouldResetFromSearch("?reset=1")).toBe(true);
    expect(shouldResetFromSearch("reset=1")).toBe(true);
    expect(shouldResetFromSearch("?reset=0")).toBe(false);
    expect(shouldResetFromSearch("")).toBe(false);
  });

  it("strips the reset param while preserving other query state", () => {
    expect(stripResetParam("http://localhost:3000/?reset=1")).toBe("/");
    expect(stripResetParam("http://localhost:3000/?reset=1&x=1")).toBe("/?x=1");
  });
});
