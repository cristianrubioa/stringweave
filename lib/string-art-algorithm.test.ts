import { describe, expect, it } from "vitest";
import {
  applyEdgeBoost,
  bresenham,
  buildLineCache,
  lineIndex,
  runGreedyAlgorithm,
  toGrayscale,
} from "./string-art-algorithm";

const BUFFER_SIZE = 500;

function makeImageData(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height, colorSpace: "srgb" } as unknown as ImageData;
}

describe("bresenham", () => {
  it("traces a horizontal line", () => {
    expect(bresenham(0, 0, 3, 0)).toEqual([0, 1, 2, 3]);
  });

  it("traces a vertical line", () => {
    expect(bresenham(0, 0, 0, 3)).toEqual([0, 500, 1000, 1500]);
  });

  it("traces a diagonal line", () => {
    expect(bresenham(0, 0, 3, 3)).toEqual([0, 501, 1002, 1503]);
  });
});

describe("lineIndex", () => {
  it("assigns unique consecutive indices to every pair for a small n", () => {
    const n = 5;
    const seen = new Set<number>();
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        seen.add(lineIndex(a, b, n));
      }
    }
    const totalLines = (n * (n - 1)) / 2;
    expect(seen.size).toBe(totalLines);
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(totalLines - 1);
  });

  it("is symmetric for swapped arguments", () => {
    expect(lineIndex(1, 3, 5)).toBe(lineIndex(3, 1, 5));
  });
});

describe("buildLineCache", () => {
  it("produces correct offsets and total pixel count for a small pin set", () => {
    const nails: [number, number][] = [
      [0, 0],
      [3, 0],
      [3, 3],
      [0, 3],
    ];
    const { pixels, offsets } = buildLineCache(nails);
    const totalLines = 6;
    expect(offsets).toHaveLength(totalLines + 1);
    expect(offsets[0]).toBe(0);

    const expectedTotal =
      bresenham(0, 0, 3, 0).length +
      bresenham(0, 0, 3, 3).length +
      bresenham(0, 0, 0, 3).length +
      bresenham(3, 0, 3, 3).length +
      bresenham(3, 0, 0, 3).length +
      bresenham(3, 3, 0, 3).length;

    expect(offsets[totalLines]).toBe(expectedTotal);
    expect(pixels).toHaveLength(expectedTotal);
  });
});

describe("toGrayscale", () => {
  it("converts a known pixel via the luminance formula", () => {
    const buffer = toGrayscale(makeImageData(1, 1, 100, 150, 200));
    const expected = Math.round(
      255 - (100 * 0.299 + 150 * 0.587 + 200 * 0.114),
    );
    expect(buffer).toHaveLength(BUFFER_SIZE * BUFFER_SIZE);
    expect(buffer[0]).toBe(expected);
  });
});

describe("applyEdgeBoost", () => {
  it("leaves a flat buffer uniformly blended toward zero edge contribution", () => {
    const buffer = new Uint8Array(BUFFER_SIZE * BUFFER_SIZE).fill(100);
    applyEdgeBoost(buffer);
    const expected = Math.round(100 * (1 - 0.35));
    expect(buffer[0]).toBe(expected);
    expect(buffer[buffer.length - 1]).toBe(expected);
    expect(buffer[Math.floor(buffer.length / 2)]).toBe(expected);
  });
});

describe("runGreedyAlgorithm", () => {
  it("is deterministic, starts at nail 0, and respects the stroke count", () => {
    const image = makeImageData(4, 4, 60, 60, 60);
    const run = () => runGreedyAlgorithm(image, 8, 5);

    const first = run();
    const second = run();

    expect(first).toEqual(second);
    expect(first[0]).toBe(0);
    expect(first.length).toBeLessThanOrEqual(6);
  });

  it("streams batches via the onBatch callback", () => {
    const image = makeImageData(4, 4, 60, 60, 60);
    const batches: [number, number][][] = [];
    const sequence = runGreedyAlgorithm(image, 8, 5, (lines) =>
      batches.push(lines),
    );

    const totalLinesStreamed = batches.reduce((sum, b) => sum + b.length, 0);
    expect(totalLinesStreamed).toBe(sequence.length - 1);
  });
});
