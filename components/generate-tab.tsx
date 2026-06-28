"use client";

import { useRef, useState, useCallback, useId, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { StringArtCanvas, type StringArtCanvasHandle } from "@/components/string-art-canvas";
import { exportSequence } from "@/lib/export";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

const PIN_OPTIONS = [120, 240, 280, 320, 480, 560, 640] as const;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

interface Props {
  onSequenceReady: (data: { sequence: number[]; pinCount: number }) => void;
}

export function GenerateTab({ onSequenceReady }: Props) {
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
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
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

  useEffect(() => {
    if (running) return;
    canvasRef.current?.drawFrame(pinCount);
  }, [pinCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = useCallback(() => {
    if (!imageFile || running) return;

    workerRef.current?.terminate();
    setRunning(true);
    setSequence(null);
    canvasRef.current?.drawFrame(pinCount);

    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const offscreen = new OffscreenCanvas(img.width, img.height);
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      const worker = new Worker(
        new URL("../workers/string-art.worker.ts", import.meta.url)
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
  }, [imageFile, pinCount, strokeCount, running]);

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="flex flex-col gap-5 w-[var(--panel-w)] shrink-0 border-r px-6 pt-6">
        <TabsList className="w-fit shrink-0 h-10">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="player">Player</TabsTrigger>
        </TabsList>
        <div>
          <Label id={uploadLabelId} className="block mb-2 text-base">Image</Label>
          <div
            role="button"
            tabIndex={0}
            aria-labelledby={uploadLabelId}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors aspect-square ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 hover:border-primary/60"
            }`}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="preview"
                className="h-full w-full object-contain rounded-lg"
              />
            ) : (
              <span className="text-sm text-muted-foreground text-center px-2">
                Drag &amp; drop or click to upload
                <br />
                <span className="text-xs">JPEG · PNG · WebP · Max 5 MB</span>
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
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
            min={100}
            max={5000}
            step={100}
            value={[strokeCount]}
            onValueChange={(v) => setStrokeCount(Array.isArray(v) ? v[0] : v)}
          />
          <div className="flex justify-between text-xs text-muted-foreground/50 mt-0.5">
            <span>100</span>
            <span>5000</span>
          </div>
        </div>

        <Button
          onClick={generate}
          disabled={!imageFile || running}
          className="w-full h-11"
        >
          <i className={running ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-bolt"} />
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

        <div className="-mx-6 px-6 mt-auto py-[var(--footer-padding-y)] border-t text-center text-sm text-muted-foreground">
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
      </aside>

      <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden">
        <div className="absolute inset-6 flex items-center justify-center">
          <div
            className="relative rounded-lg border bg-white overflow-hidden"
            style={{ height: "100%", width: "auto", maxWidth: "100%", aspectRatio: "1 / 1" }}
          >
            <StringArtCanvas ref={canvasRef} defaultPinCount={320} />
            {sequence && (
              <button
                type="button"
                onClick={() => canvasRef.current?.exportPng()}
                title="Download as PNG"
                className="absolute top-2 right-2 size-9 flex items-center justify-center rounded-md bg-background/80 border hover:bg-background transition-colors"
              >
                <i className="fa-solid fa-download text-sm" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
