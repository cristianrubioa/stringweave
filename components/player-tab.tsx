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

export function PlayerTab() {
  const [sequence, setSequence] = useState<number[] | null>(null);
  const [pinCount, setPinCount] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<StringArtCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const positionRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const sequenceRef = useRef<number[] | null>(null);
  const pinCountRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawnUpToRef = useRef(0);

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
      const next = positionRef.current + 30;
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

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
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
        setTimeout(() => canvasRef.current?.drawFrame(result.pinCount), 0);
      };
      reader.readAsText(file);
    },
    [stopPlayback]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="flex flex-col gap-5 w-80 shrink-0 border-r px-6 pt-6 pb-6">
        <TabsList className="w-fit shrink-0">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="player">Player</TabsTrigger>
        </TabsList>
        <div>
          <Label className="block mb-2 text-base">Sequence file</Label>
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={() => fileInputRef.current?.click()}
          >
            <i className="fa-solid fa-file-import" />
            Import .txt
          </Button>
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
                onClick={() => {
                  const prev = Math.max(0, position - 1);
                  handleSliderChange([prev]);
                }}
                disabled={position === 0}
              >
                ‹
              </Button>
              <Button
                className="flex-1"
                onClick={() => (playing ? stopPlayback() : startPlayback())}
              >
                {playing ? "Pause" : "Play"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const next = Math.min(total - 1, position + 1);
                  handleSliderChange([next]);
                }}
                disabled={position >= total - 1}
              >
                ›
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
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
