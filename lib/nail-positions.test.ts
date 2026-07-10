import { describe, it, expect } from "vitest";
import { getNailPositions } from "./nail-positions";

describe("getNailPositions", () => {
  it("returns exactly pinCount entries", () => {
    const positions = getNailPositions(16, 0, 0, 10);
    expect(positions).toHaveLength(16);
  });

  it("places the first nail at the top of the circle", () => {
    const [x, y] = getNailPositions(4, 100, 100, 50)[0];
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(50);
  });

  it("spaces nails symmetrically around the center", () => {
    const positions = getNailPositions(4, 0, 0, 10);
    const [top, right, bottom, left] = positions;
    expect(top[0]).toBeCloseTo(0);
    expect(top[1]).toBeCloseTo(-10);
    expect(right[0]).toBeCloseTo(10);
    expect(right[1]).toBeCloseTo(0);
    expect(bottom[0]).toBeCloseTo(0);
    expect(bottom[1]).toBeCloseTo(10);
    expect(left[0]).toBeCloseTo(-10);
    expect(left[1]).toBeCloseTo(0);
  });
});
