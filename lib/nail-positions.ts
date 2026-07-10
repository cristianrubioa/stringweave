export function getNailPositions(
  pinCount: number,
  cx: number,
  cy: number,
  r: number,
): [number, number][] {
  const positions: [number, number][] = [];
  for (let i = 0; i < pinCount; i++) {
    const angle = (2 * Math.PI * i) / pinCount - Math.PI / 2;
    positions.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return positions;
}
