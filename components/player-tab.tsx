"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  StringArtCanvas,
  type StringArtCanvasHandle,
} from "@/components/string-art-canvas";
import { parseSequenceFile } from "@/lib/export";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

const SPEED_OPTIONS = [
  { label: "¼x", step: 7,   title: "Quarter speed" },
  { label: "½x", step: 15,  title: "Half speed" },
  { label: "1x", step: 30,  title: "Normal speed" },
  { label: "2x", step: 60,  title: "Double speed" },
  { label: "4x", step: 120, title: "4× speed" },
] as const;

const HOLD_DELAY_MS = 400;
const HOLD_INTERVAL_MS = 80;

interface Props {
  sharedSequence?: { sequence: number[]; pinCount: number } | null;
  onClearSequence?: () => void;
}

export function PlayerTab({ sharedSequence, onClearSequence }: Props) {
  const [sequence, setSequence] = useState<number[] | null>(null);
  const [pinCount, setPinCount] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sequenceSource, setSequenceSource] = useState<"generate" | "file" | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [speed, setSpeed] = useState(30);

  const canvasRef = useRef<StringArtCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const positionRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const sequenceRef = useRef<number[] | null>(null);
  const pinCountRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawnUpToRef = useRef(0);
  const speedRef = useRef(30);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = sequence?.length ?? 0;

  const drawUpTo = useCallback(
    (target: number, currentDrawn: number) => {
      if (!sequenceRef.current || !canvasRef.current) return;
      const seq = sequenceRef.current;
      const pc = pinCountRef.current;

      if (target < currentDrawn) {
        canvasRef.current.drawFrame(pc);
        const lines: [number, number][] = [];
        for (let i = 0; i < target && i + 1 < seq.length; i++) {
          lines.push([seq[i], seq[i + 1]]);
          if (lines.length === 50) {
            canvasRef.current.drawLineBatch(lines);
            lines.length = 0;
          }
        }
        if (lines.length > 0) canvasRef.current.drawLineBatch(lines);
        drawnUpToRef.current = target;
      } else {
        const lines: [number, number][] = [];
        for (let i = currentDrawn; i < target && i + 1 < seq.length; i++) {
          lines.push([seq[i], seq[i + 1]]);
          if (lines.length === 50) {
            canvasRef.current.drawLineBatch(lines);
            lines.length = 0;
          }
        }
        if (lines.length > 0) canvasRef.current.drawLineBatch(lines);
        drawnUpToRef.current = target;
      }

      if (target > 0 && seq[target] !== undefined) {
        canvasRef.current.clearHighlight(pc);
        canvasRef.current.highlightNail(seq[target], pc);
      }
    },
    []
  );

  const stepTo = useCallback((target: number) => {
    const seq = sequenceRef.current;
    if (!seq) return;
    const clamped = Math.max(0, Math.min(seq.length - 1, target));
    positionRef.current = clamped;
    setPosition(clamped);
    drawUpTo(clamped, drawnUpToRef.current);
  }, [drawUpTo]);

  const handleSliderChange = useCallback(
    (raw: number | number[] | readonly number[]) => {
      const value = Array.isArray(raw) ? (raw as number[])[0] : (raw as number);
      setPosition(value);
      positionRef.current = value;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        drawUpTo(value, drawnUpToRef.current);
      }, 150);
    },
    [drawUpTo]
  );

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (holdIntervalRef.current) { clearInterval(holdIntervalRef.current); holdIntervalRef.current = null; }
  }, []);

  const startHold = useCallback((direction: -1 | 1) => {
    holdTimerRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        const seq = sequenceRef.current;
        if (!seq) return;
        stepTo(positionRef.current + direction);
      }, HOLD_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  }, [stepTo]);

  const stopPlayback = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (!sequenceRef.current) return;
    setPlaying(true);

    const tick = () => {
      const seq = sequenceRef.current;
      if (!seq) return;
      const next = positionRef.current + speedRef.current;
      const capped = Math.min(next, seq.length - 1);

      drawUpTo(capped, drawnUpToRef.current);
      positionRef.current = capped;
      setPosition(capped);

      if (capped >= seq.length - 1) {
        stopPlayback();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [drawUpTo, stopPlayback]);

  const handleRestart = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    positionRef.current = 0;
    drawnUpToRef.current = 0;
    setPosition(0);
    canvasRef.current?.drawFrame(pinCountRef.current);
    if (playing) {
      startPlayback();
    }
  }, [playing, startPlayback]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const name = file.name;
      e.target.value = "";

      stopPlayback();
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const result = parseSequenceFile(text);
        if (!result) {
          setError("Could not parse file. Expected format: 1\\t<n0>,<n1>,…");
          return;
        }
        setError(null);
        setSequence(result.sequence);
        setPinCount(result.pinCount);
        setPosition(0);
        positionRef.current = 0;
        drawnUpToRef.current = 0;
        sequenceRef.current = result.sequence;
        pinCountRef.current = result.pinCount;
        setSequenceSource("file");
        setFileName(name);
        setTimeout(() => canvasRef.current?.drawFrame(result.pinCount), 0);
      };
      reader.readAsText(file);
    },
    [stopPlayback]
  );

  const handleReset = useCallback(() => {
    stopPlayback();
    canvasRef.current?.drawFrame(pinCountRef.current);
    setSequence(null);
    setPinCount(0);
    setPosition(0);
    positionRef.current = 0;
    drawnUpToRef.current = 0;
    sequenceRef.current = null;
    pinCountRef.current = 0;
    setSequenceSource(null);
    setFileName(null);
    setError(null);
    onClearSequence?.();
  }, [stopPlayback, onClearSequence]);

  useEffect(() => {
    if (!sharedSequence) return;
    stopPlayback();
    setSequence(sharedSequence.sequence);
    setPinCount(sharedSequence.pinCount);
    setPosition(0);
    positionRef.current = 0;
    drawnUpToRef.current = 0;
    sequenceRef.current = sharedSequence.sequence;
    pinCountRef.current = sharedSequence.pinCount;
    setSequenceSource("generate");
    setFileName(null);
    setTimeout(() => canvasRef.current?.drawFrame(sharedSequence.pinCount), 0);
  }, [sharedSequence, stopPlayback]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="flex flex-col gap-5 w-80 shrink-0 border-r px-6 pt-6 pb-6">
        <TabsList className="w-fit shrink-0 h-10">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="player">Player</TabsTrigger>
        </TabsList>

        <div className="h-px bg-border" />
        <div>
          <Label className="block mb-2 text-base">
            {sequenceSource === "file" ? "Sequence file" : "Sequence"}
          </Label>
          {sequenceSource === null ? (
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => fileInputRef.current?.click()}
              title="Import a sequence .txt file"
            >
              <i className="fa-solid fa-file-import" />
              Import .txt
            </Button>
          ) : (
            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1 h-11 rounded-md border px-3 text-sm text-muted-foreground overflow-hidden">
                <i className="fa-solid fa-check shrink-0" />
                <span className="truncate">
                  {sequenceSource === "generate" ? "From Generate" : (fileName ?? "sequence.txt")}
                </span>
              </div>
              <Button
                variant="outline"
                className="h-11 w-11 shrink-0 p-0"
                onClick={handleReset}
                title="Clear sequence and load another"
              >
                <i className="fa-solid fa-rotate" />
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="sr-only"
            onChange={handleFileChange}
          />
          {error && <p className="text-destructive text-xs mt-1">{error}</p>}
        </div>

        {sequence && (
          <>
            <div className="h-px bg-border" />
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-base">Timeline</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {position} / {total - 1}
                </span>
              </div>
              <Slider
                min={0}
                max={total - 1}
                step={1}
                value={[position]}
                onValueChange={handleSliderChange}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRestart}
                disabled={position === 0}
                title="Restart from beginning"
              >
                <i className="fa-solid fa-backward-step" />
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => stepTo(positionRef.current - 1)}
                onPointerDown={() => startHold(-1)}
                onPointerUp={clearHold}
                onPointerLeave={clearHold}
                disabled={position === 0}
                title="Step back"
              >
                <i className="fa-solid fa-chevron-left" />
              </Button>
              <Button
                className="flex-1"
                onClick={() => (playing ? stopPlayback() : startPlayback())}
                title={playing ? "Pause" : "Play"}
              >
                <i className={playing ? "fa-solid fa-pause" : "fa-solid fa-play"} />
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => stepTo(positionRef.current + 1)}
                onPointerDown={() => startHold(1)}
                onPointerUp={clearHold}
                onPointerLeave={clearHold}
                disabled={position >= total - 1}
                title="Step forward"
              >
                <i className="fa-solid fa-chevron-right" />
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-base">Speed</Label>
              <div className="flex rounded-md border overflow-hidden">
                {SPEED_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.step}
                    type="button"
                    aria-pressed={speed === opt.step}
                    title={opt.title}
                    onClick={() => {
                      setSpeed(opt.step);
                      speedRef.current = opt.step;
                    }}
                    className={`flex-1 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                      i > 0 ? "border-l" : ""
                    } ${
                      speed === opt.step
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Pins:</span> {pinCount}
            </div>
          </>
        )}

        <div className="mt-auto pt-4 border-t text-center text-sm text-muted-foreground">
          Made with <span className="text-red-400">♥</span> by{" "}
          <a
            href="https://github.com/cristianrubioa"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            @cristianrubioa
          </a>
        </div>
      </aside>

      <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden">
        <div className="absolute inset-6 flex items-center justify-center">
          <div
            className="rounded-lg border bg-white overflow-hidden"
            style={{ height: "100%", width: "auto", maxWidth: "100%", aspectRatio: "1 / 1" }}
          >
            <StringArtCanvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
