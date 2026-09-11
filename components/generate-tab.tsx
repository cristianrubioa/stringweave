"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { PanelShell } from "@/components/panel-shell";
import {
  StringArtCanvas,
  type StringArtCanvasHandle,
} from "@/components/string-art-canvas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportSequence } from "@/lib/export";

const PIN_OPTIONS = [120, 240, 280, 320, 480, 560, 640] as const;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

interface Props {
  onSequenceReady: (data: { sequence: number[]; pinCount: number }) => void;
  panelOpen: boolean;
  onClosePanel: () => void;
}

export function GenerateTab({
  onSequenceReady,
  panelOpen,
  onClosePanel,
}: Props) {
  const [pinCount, setPinCount] = useState(320);
  const [strokeCount, setStrokeCount] = useState(2000);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [sequence, setSequence] = useState<number[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canvasRef = useRef<StringArtCanvasHandle>(null);
  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadLabelId = useId();
  const uploadHintId = useId();

  const handleFile = useCallback((file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      setUploadError("Only JPEG, PNG, and WebP images are accepted.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError("Image must be smaller than 5 MB.");
      return;
    }
    setUploadError(null);
    setImageFile(file);
    setSequence(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally excludes 'running' so this effect only redraws on pinCount changes, not on every play/pause of generation
  useEffect(() => {
    if (running) return;
    canvasRef.current?.drawFrame(pinCount);
  }, [pinCount]);

  const generate = useCallback(() => {
    if (!imageFile || running) return;

    onClosePanel();
    workerRef.current?.terminate();
    setRunning(true);
    setSequence(null);
    canvasRef.current?.drawFrame(pinCount);

    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const offscreen = new OffscreenCanvas(img.width, img.height);
      // biome-ignore lint/style/noNonNullAssertion: "2d" context creation cannot fail, unlike webgl
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      const worker = new Worker(
        new URL("../workers/string-art.worker.ts", import.meta.url),
      );
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "batch") {
          canvasRef.current?.drawLineBatch(msg.lines);
        } else if (msg.type === "done") {
          setSequence(msg.sequence);
          setRunning(false);
          worker.terminate();
          workerRef.current = null;
          onSequenceReady({ sequence: msg.sequence, pinCount });
        }
      };

      worker.postMessage({ imageData, pinCount, strokeCount });
    };
    img.src = url;
  }, [
    imageFile,
    pinCount,
    strokeCount,
    running,
    onSequenceReady,
    onClosePanel,
  ]);

  return (
    <div className="flex flex-1 min-h-0">
      <PanelShell
        open={panelOpen}
        onClose={onClosePanel}
        footer={
          <div
            className="border-t px-6 text-center text-sm"
            style={{
              color: "var(--footer-text-color, #4b5563)",
              paddingTop: "var(--footer-padding-y, 0.75rem)",
              paddingBottom: "var(--footer-padding-y, 0.75rem)",
            }}
          >
            Made with <span className="text-red-400 text-base">♥</span> by{" "}
            <a
              href="https://github.com/cristianrubioa"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              @cristianrubioa
            </a>
          </div>
        }
      >
        <TabsList className="w-full shrink-0">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="player">Player</TabsTrigger>
        </TabsList>
        <div>
          <Label id={uploadLabelId} className="block mb-2 text-base">
            Image
          </Label>
          <button
            type="button"
            aria-labelledby={uploadLabelId}
            aria-describedby={previewUrl ? undefined : uploadHintId}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors aspect-square w-full ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 hover:border-primary/60"
            }`}
          >
            {previewUrl ? (
              // biome-ignore lint/performance/noImgElement: blob preview URL, next/image needs static dimensions/loader config unsuited for a transient object URL
              <img
                src={previewUrl}
                alt="preview"
                className="h-full w-full object-contain rounded-lg"
              />
            ) : (
              <span
                id={uploadHintId}
                className="text-sm text-muted-foreground text-center px-2"
              >
                Drag &amp; drop or click to upload
                <br />
                <span className="text-xs">JPEG · PNG · WebP · Max 5 MB</span>
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-labelledby={uploadLabelId}
            className="sr-only"
            onChange={onFileInput}
          />
          {uploadError && (
            <p className="text-destructive text-xs mt-1">{uploadError}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-base">Pins</Label>
          <div className="flex rounded-md border overflow-hidden">
            {PIN_OPTIONS.map((p, i) => (
              <button
                key={p}
                type="button"
                aria-pressed={pinCount === p}
                onClick={() => setPinCount(p)}
                disabled={running}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${
                  i > 0 ? "border-l" : ""
                } ${
                  pinCount === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-base">Strokes</Label>
            <span className="text-sm tabular-nums">{strokeCount}</span>
          </div>
          <Slider
            aria-label="Strokes"
            min={100}
            max={5000}
            step={100}
            value={[strokeCount]}
            onValueChange={(v) => setStrokeCount(Array.isArray(v) ? v[0] : v)}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>100</span>
            <span>5000</span>
          </div>
        </div>

        <Button
          onClick={generate}
          disabled={!imageFile || running}
          className="w-full h-10 text-base"
        >
          <i
            className={
              running ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-bolt"
            }
          />
          {running ? "Generating…" : "Generate"}
        </Button>

        {sequence && (
          <Button
            variant="outline"
            onClick={() => exportSequence(sequence)}
            className="w-full"
          >
            <i className="fa-solid fa-file-export" />
            Export .txt
          </Button>
        )}
      </PanelShell>

      <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden">
        <div
          data-slot="canvas-wrap"
          className="absolute inset-6 flex items-center justify-center"
        >
          <div className="relative">
            <StringArtCanvas ref={canvasRef} defaultPinCount={320} />
            {sequence && (
              <button
                type="button"
                onClick={() => canvasRef.current?.exportPng()}
                title="Download as PNG"
                className="fixed bottom-6 right-6 z-20 size-14 rounded-full shadow-lg md:absolute md:top-2 md:right-2 md:bottom-auto md:size-9 md:rounded-md md:shadow-none flex items-center justify-center bg-background/90 md:bg-background/80 border hover:bg-background transition-colors"
              >
                <i className="fa-solid fa-download text-lg md:text-sm" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
