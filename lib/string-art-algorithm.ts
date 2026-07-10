import { getNailPositions } from "./nail-positions";

const BUFFER_SIZE = 500;
const EDGE_BLEND = 0.35;
const INK_WEIGHT = 4000;
const REUSE_PENALTY = 0.5;

export function toGrayscale(imageData: ImageData): Uint8Array {
  const src = imageData.data;
  const srcW = imageData.width;
  const srcH = imageData.height;
  const dst = new Uint8Array(BUFFER_SIZE * BUFFER_SIZE);

  for (let dy = 0; dy < BUFFER_SIZE; dy++) {
    for (let dx = 0; dx < BUFFER_SIZE; dx++) {
      const sx = Math.floor((dx * srcW) / BUFFER_SIZE);
      const sy = Math.floor((dy * srcH) / BUFFER_SIZE);
      const i = (sy * srcW + sx) * 4;
      dst[dy * BUFFER_SIZE + dx] =
        255 - (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114);
    }
  }
  return dst;
}

export function applyEdgeBoost(buffer: Uint8Array): void {
  const size = BUFFER_SIZE;
  const edges = new Uint8Array(size * size);
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const gx =
        -buffer[(y - 1) * size + (x - 1)] -
        2 * buffer[y * size + (x - 1)] -
        buffer[(y + 1) * size + (x - 1)] +
        buffer[(y - 1) * size + (x + 1)] +
        2 * buffer[y * size + (x + 1)] +
        buffer[(y + 1) * size + (x + 1)];
      const gy =
        -buffer[(y - 1) * size + (x - 1)] -
        2 * buffer[(y - 1) * size + x] -
        buffer[(y - 1) * size + (x + 1)] +
        buffer[(y + 1) * size + (x - 1)] +
        2 * buffer[(y + 1) * size + x] +
        buffer[(y + 1) * size + (x + 1)];
      edges[y * size + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy));
    }
  }
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.min(
      255,
      Math.round(buffer[i] * (1 - EDGE_BLEND) + edges[i] * EDGE_BLEND),
    );
  }
}

export function bresenham(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number[] {
  const pixels: number[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;

  while (true) {
    if (x >= 0 && x < BUFFER_SIZE && y >= 0 && y < BUFFER_SIZE) {
      pixels.push(y * BUFFER_SIZE + x);
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return pixels;
}

export function buildLineCache(nails: [number, number][]): {
  pixels: Int32Array;
  offsets: Uint32Array;
} {
  const n = nails.length;
  const totalLines = (n * (n - 1)) / 2;
  const offsets = new Uint32Array(totalLines + 1);

  const allPixelArrays: number[][] = [];
  let idx = 0;
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const [x0, y0] = nails[a].map(Math.round) as [number, number];
      const [x1, y1] = nails[b].map(Math.round) as [number, number];
      const px = bresenham(x0, y0, x1, y1);
      allPixelArrays.push(px);
      offsets[idx + 1] = offsets[idx] + px.length;
      idx++;
    }
  }

  const pixels = new Int32Array(offsets[totalLines]);
  let offset = 0;
  for (const arr of allPixelArrays) {
    pixels.set(arr, offset);
    offset += arr.length;
  }

  return { pixels, offsets };
}

export function lineIndex(a: number, b: number, n: number): number {
  if (a > b) [a, b] = [b, a];
  return a * n - (a * (a + 1)) / 2 + (b - a - 1);
}

export function runGreedyAlgorithm(
  imageData: ImageData,
  pinCount: number,
  strokeCount: number,
  onBatch?: (lines: [number, number][]) => void,
): number[] {
  const buffer = toGrayscale(imageData);

  // Contrast stretch: map [min, max] to [0, 255] so any image uses the full range
  let minVal = 255,
    maxVal = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] < minVal) minVal = buffer[i];
    if (buffer[i] > maxVal) maxVal = buffer[i];
  }
  if (maxVal > minVal) {
    const range = maxVal - minVal;
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.round(((buffer[i] - minVal) * 255) / range);
    }
  }

  applyEdgeBoost(buffer);

  const cx = BUFFER_SIZE / 2;
  const cy = BUFFER_SIZE / 2;
  const r = BUFFER_SIZE * 0.47;
  const nails = getNailPositions(pinCount, cx, cy, r);
  const { pixels, offsets } = buildLineCache(nails);

  const totalLines = (pinCount * (pinCount - 1)) / 2;
  const lineUsage = new Uint16Array(totalLines);

  const minDist = Math.floor(pinCount * 0.05);
  const sequence: number[] = [];
  let current = 0;
  sequence.push(current);

  const batch: [number, number][] = [];

  for (let stroke = 0; stroke < strokeCount; stroke++) {
    let bestNail = -1;
    let bestScore = -1;

    for (let candidate = 0; candidate < pinCount; candidate++) {
      if (candidate === current) continue;
      const dist = Math.min(
        Math.abs(candidate - current),
        pinCount - Math.abs(candidate - current),
      );
      if (dist < minDist) continue;

      const li = lineIndex(current, candidate, pinCount);
      const start = offsets[li];
      const end = offsets[li + 1];
      const lineLen = end - start;
      if (lineLen === 0) continue;
      let score = 0;
      for (let p = start; p < end; p++) {
        score += buffer[pixels[p]];
      }
      score /= lineLen;
      score /= 1 + lineUsage[li] * REUSE_PENALTY;
      if (score > bestScore) {
        bestScore = score;
        bestNail = candidate;
      }
    }

    if (bestNail === -1) break;

    const li = lineIndex(current, bestNail, pinCount);
    const start = offsets[li];
    const end = offsets[li + 1];
    const lineLen = end - start;
    const decrement = Math.round(INK_WEIGHT / lineLen);
    for (let p = start; p < end; p++) {
      buffer[pixels[p]] = Math.max(0, buffer[pixels[p]] - decrement);
    }
    lineUsage[li]++;

    batch.push([current, bestNail]);
    sequence.push(bestNail);
    current = bestNail;

    if (batch.length === 20) {
      onBatch?.([...batch]);
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    onBatch?.([...batch]);
  }

  return sequence;
}
