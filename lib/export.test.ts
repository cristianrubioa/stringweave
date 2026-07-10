import { afterEach, describe, expect, it, vi } from "vitest";
import { parseSequenceFile, timestampFilename } from "./export";

describe("timestampFilename", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("zero-pads date/time parts and appends the given extension", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 3, 7, 9));
    expect(timestampFilename("png")).toBe("20260105_030709.png");
  });

  it("uses the provided extension", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
    expect(timestampFilename("txt")).toBe("20261231_235959.txt");
  });
});

describe("parseSequenceFile", () => {
  it("parses a well-formed sequence file", () => {
    const result = parseSequenceFile("1\t0,5,10\n");
    expect(result).toEqual({ sequence: [0, 5, 10], pinCount: 120 });
  });

  it("returns null for an empty file", () => {
    expect(parseSequenceFile("")).toBeNull();
  });

  it("returns null for a whitespace-only file", () => {
    expect(parseSequenceFile("   \n\t\n  ")).toBeNull();
  });

  it("filters out non-numeric entries and returns null if none remain", () => {
    expect(parseSequenceFile("1\tabc,def,ghi\n")).toBeNull();
  });

  it("filters out non-numeric entries but keeps valid ones", () => {
    const result = parseSequenceFile("1\t0,abc,5\n");
    expect(result?.sequence).toEqual([0, 5]);
  });

  it.each([
    [119, 120],
    [120, 240],
    [239, 240],
    [240, 280],
    [279, 280],
    [280, 320],
    [479, 480],
    [480, 560],
    [559, 560],
    [560, 640],
    [639, 640],
    [640, 640],
    [1000, 640],
  ])("infers pinCount %i for a max index of %i", (maxIndex, expectedPinCount) => {
    const result = parseSequenceFile(`1\t0,${maxIndex}\n`);
    expect(result?.pinCount).toBe(expectedPinCount);
  });
});
