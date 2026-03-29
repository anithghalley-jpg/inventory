import { describe, expect, it } from "vitest";

import { findNearestCardToContainerMidpoint } from "./fabAcademySync";

describe("findNearestCardToContainerMidpoint", () => {
  it("returns the visible card closest to the container midpoint", () => {
    const result = findNearestCardToContainerMidpoint({
      containerTop: 100,
      containerHeight: 400,
      cards: [
        { id: "a", top: 100, bottom: 220, height: 120 },
        { id: "b", top: 240, bottom: 380, height: 140 },
        { id: "c", top: 400, bottom: 540, height: 140 },
      ],
    });

    expect(result).toBe("b");
  });

  it("ignores non-visible cards when visible candidates exist", () => {
    const result = findNearestCardToContainerMidpoint({
      containerTop: 300,
      containerHeight: 260,
      cards: [
        { id: "top", top: 80, bottom: 220, height: 140 },
        { id: "middle", top: 320, bottom: 470, height: 150 },
        { id: "bottom", top: 490, bottom: 650, height: 160 },
      ],
    });

    expect(result).toBe("middle");
  });

  it("falls back to measurable cards when none are visible", () => {
    const result = findNearestCardToContainerMidpoint({
      containerTop: 500,
      containerHeight: 200,
      cards: [
        { id: "a", top: 100, bottom: 180, height: 80 },
        { id: "b", top: 220, bottom: 340, height: 120 },
      ],
    });

    expect(result).toBe("b");
  });

  it("returns null for empty or zero-height inputs", () => {
    expect(
      findNearestCardToContainerMidpoint({
        containerTop: 0,
        containerHeight: 0,
        cards: [{ id: "a", top: 0, bottom: 100, height: 100 }],
      })
    ).toBeNull();

    expect(
      findNearestCardToContainerMidpoint({
        containerTop: 0,
        containerHeight: 200,
        cards: [],
      })
    ).toBeNull();
  });
});
