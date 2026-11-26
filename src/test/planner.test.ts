import { describe, expect, it } from "vitest";
import { attendancePlanner, currentStreak } from "@/lib/insights";

describe("streak", () => {
  it("counts present and late until the first absence", () => {
    expect(currentStreak(["present", "late", "present", "absent", "present"])).toBe(3);
  });
  it("is zero when the latest class was missed", () => {
    expect(currentStreak(["absent", "present"])).toBe(0);
  });
});

describe("attendance planner (75%)", () => {
  it("6 of 10 attended needs 6 more classes in a row", () => {
    expect(attendancePlanner(6, 10)).toEqual({ mustAttend: 6, canMiss: 0 });
  });
  it("9 of 10 attended can miss 2 classes", () => {
    expect(attendancePlanner(9, 10)).toEqual({ mustAttend: 0, canMiss: 2 });
  });
  it("exactly 75% can miss none", () => {
    expect(attendancePlanner(3, 4)).toEqual({ mustAttend: 0, canMiss: 0 });
  });
});
