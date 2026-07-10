"use client";

import {
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { timestampFilename } from "@/lib/export";
import { getNailPositions } from "@/lib/nail-positions";

export interface StringArtCanvasHandle {
  drawFrame: (pinCount: number) => void;
  drawLineBatch: (lines: [number, number][]) => void;
  highlightNail: (nailIndex: number, pinCount: number) => void;
  clearHighlight: (pinCount: number) => void;
  exportPng: () => void;
}

interface Props {
  ref: Ref<StringArtCanvasHandle>;
  defaultPinCount?: number;
}

export function StringArtCanvas({ ref, defaultPinCount }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nailsRef = useRef<[number, number][]>([]);
  const pinCountRef = useRef(0);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext("2d") : null;
  }, []);

  const getLayout = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.47;
    return { cx, cy, r, size };
  }, []);

  const drawFrame = useCallback(
    (pinCount: number) => {
      const ctx = getCtx();
      const layout = getLayout();
      if (!ctx || !layout) return;
      const { cx, cy, r, size } = layout;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      const nails = getNailPositions(pinCount, cx, cy, r);
      nailsRef.current = nails;
      pinCountRef.current = pinCount;

      ctx.fillStyle = "#888888";
      for (const [x, y] of nails) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [getLayout, getCtx],
  );

  const drawLineBatch = useCallback(
    (lines: [number, number][]) => {
      const ctx = getCtx();
      const nails = nailsRef.current;
      if (!ctx || nails.length === 0) return;

      ctx.globalAlpha = 0.09;
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (const [a, b] of lines) {
        const [x1, y1] = nails[a];
        const [x2, y2] = nails[b];
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    [getCtx],
  );

  const highlightNail = useCallback(
    (nailIndex: number, pinCount: number) => {
      const ctx = getCtx();
      const layout = getLayout();
      if (!ctx || !layout) return;
      const { cx, cy, r } = layout;
      const nails = getNailPositions(pinCount, cx, cy, r);
      const [x, y] = nails[nailIndex] ?? [0, 0];

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(String(nailIndex), x + 8, y + 4);
    },
    [getLayout, getCtx],
  );

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const filename = timestampFilename("png");
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }, []);

  const clearHighlight = useCallback(
    (pinCount: number) => {
      const ctx = getCtx();
      const layout = getLayout();
      if (!ctx || !layout) return;
      const { cx, cy, r } = layout;
      const nails = getNailPositions(pinCount, cx, cy, r);

      ctx.fillStyle = "#888888";
      for (const [nx, ny] of nails) {
        ctx.beginPath();
        ctx.arc(nx, ny, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [getLayout, getCtx],
  );

  useImperativeHandle(
    ref,
    () => ({
      drawFrame,
      drawLineBatch,
      highlightNail,
      clearHighlight,
      exportPng,
    }),
    [drawFrame, drawLineBatch, highlightNail, clearHighlight, exportPng],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const size = Math.min(canvas.offsetWidth, canvas.offsetHeight);
      if (size === 0) return;
      canvas.width = size;
      canvas.height = size;
      const pinCount =
        pinCountRef.current > 0 ? pinCountRef.current : (defaultPinCount ?? 0);
      if (pinCount > 0) drawFrame(pinCount);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawFrame, defaultPinCount]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
