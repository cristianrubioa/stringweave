import { runGreedyAlgorithm } from "@/lib/string-art-algorithm";

type WorkerInput = {
  imageData: ImageData;
  pinCount: number;
  strokeCount: number;
};

type BatchMessage = {
  type: "batch";
  lines: [number, number][];
};

type DoneMessage = {
  type: "done";
  sequence: number[];
};

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { imageData, pinCount, strokeCount } = e.data;

  const sequence = runGreedyAlgorithm(
    imageData,
    pinCount,
    strokeCount,
    (lines) => {
      const msg: BatchMessage = { type: "batch", lines };
      self.postMessage(msg);
    },
  );

  const doneMsg: DoneMessage = { type: "done", sequence };
  self.postMessage(doneMsg);
};
