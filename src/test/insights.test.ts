import { describe, expect, it } from "vitest";
import { attendanceBand, attendancePercent, classesStillNeeded, isAtRisk, teachingSuggestions, toCsv } from "@/lib/insights";

describe("attendance rules", () => {
  it("counts late as attended", () => {
    expect(attendancePercent(["present", "late", "absent", "absent"])).toBe(50);
  });
  it("returns 0 with no records", () => {
    expect(attendancePercent([])).toBe(0);
  });
  it("flags below 75% as at risk", () => {
    expect(isAtRisk(74)).toBe(true);
    expect(isAtRisk(75)).toBe(false);
  });
  it("suggests a break when engagement is under 50", () => {
    expect(teachingSuggestions({ attendance: 90, engagement: 40 })[0]?.title).toBe("Engagement is low");
  });
  it("escapes CSV quotes", () => {
    expect(toCsv([{ a: 'x"y' }])).toBe('a\n"x""y"');
  });
  it("prevents spreadsheet formulas in exported student values", () => {
    expect(toCsv([{ name: '=HYPERLINK("example")' }])).toBe('name\n"\'=HYPERLINK(""example"")"');
  });
});

describe("university minimum attendance", () => {
  it("marks green at the minimum, yellow just below, red far below", () => {
    expect(attendanceBand(80, 80)).toBe("green");
    expect(attendanceBand(72, 80)).toBe("yellow");
    expect(attendanceBand(69, 80)).toBe("red");
  });
  it("suggests how many more classes to attend out of a fixed total", () => {
    expect(classesStillNeeded(10, 15, 40, 75)).toEqual({ need: 20, remaining: 25, reachable: true });
    expect(classesStillNeeded(30, 35, 40, 75)).toEqual({ need: 0, remaining: 5, reachable: true });
    expect(classesStillNeeded(5, 30, 40, 75)).toEqual({ need: 25, remaining: 10, reachable: false });
  });
});
