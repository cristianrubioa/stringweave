const SUPPORTED_PIN_COUNTS = [120, 240, 280, 320, 480, 560, 640] as const;

export function exportSequence(sequence: number[]): void {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const filename =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.txt`;

  const content = `1\t${sequence.join(",")}\n`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function inferPinCount(maxIndex: number): number {
  const need = maxIndex + 1;
  return (
    SUPPORTED_PIN_COUNTS.find((p) => p >= need) ??
    SUPPORTED_PIN_COUNTS[SUPPORTED_PIN_COUNTS.length - 1]
  );
}

export function parseSequenceFile(text: string): {
  sequence: number[];
  pinCount: number;
} | null {
  try {
    const line = text.split("\n").find((l) => l.trim().length > 0);
    if (!line) return null;
    const tabIdx = line.indexOf("\t");
    const raw = tabIdx >= 0 ? line.slice(tabIdx + 1) : line;
    const sequence = raw
      .trim()
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    if (sequence.length === 0) return null;
    const maxIndex = Math.max(...sequence);
    const pinCount = inferPinCount(maxIndex);
    return { sequence, pinCount };
  } catch {
    return null;
  }
}
