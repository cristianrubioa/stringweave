# stringweave

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green)

Turns any image into string art. Upload a photo, pick pins and strokes, and watch the drawing build itself — one straight line at a time.

![stringweave preview](public/preview.png)

## Features

**Generate** — Upload JPEG/PNG/WebP (up to 5 MB), choose 120–640 pins and up to 5 000 strokes. The algorithm runs off the main thread and streams lines to the canvas as it goes, so the image emerges in real time. Export the nail sequence as `.txt` or download the final canvas as PNG.

**Player** — Import any `.txt` sequence (or use one just generated) and replay it stroke by stroke. Scrub the timeline, step forward/back, or play at speeds from ¼× to 4×.

## How it works

```mermaid
sequenceDiagram
    actor User
    participant UI as Generate tab
    participant Worker as Web Worker
    participant Canvas as StringArtCanvas

    User->>UI: Upload image + set pins / strokes
    User->>UI: Click Generate
    UI->>Worker: postMessage { imageData, pinCount, strokeCount }
    loop every 20 strokes
        Worker-->>UI: { type: "batch", lines: [[a,b], …] }
        UI->>Canvas: drawLineBatch(lines)
    end
    Worker-->>UI: { type: "done", sequence: [0, 42, 17, …] }
    User->>UI: Export → sequence.txt or canvas PNG
    UI-->>Player: sharedSequence (auto-populated)
```

## Algorithm

The worker processes the image through several stages before the greedy stroke loop:

```mermaid
flowchart TD
    A[Input image] --> B["Grayscale + invert\n500×500 px buffer"]
    B --> C["Contrast stretch\nmap pixel range → 0–255"]
    C --> D["Edge boost\nSobel blended at 35%"]
    D --> E[Place N pins on circle]
    E --> F["Build line cache\nBresenham for all N×(N−1)/2 pairs"]
    F --> G{Greedy loop}
    G --> H["Score candidates\navg brightness ÷ reuse penalty"]
    H --> I[Pick best nail]
    I --> J[Subtract ink from buffer]
    J --> K{More strokes?}
    K -- yes --> G
    K -- no --> L[Emit done + sequence]
```

## Sequence file format

Exported `.txt` files use a tab-delimited format:

```
1	0,42,17,305,…
```

Column 1 is a version tag (`1`). Column 2 is the comma-separated nail sequence. The Player infers the pin count from the highest index in the sequence.

## Run

```bash
npm install
npm run dev     # dev server at localhost:3000
npm run build   # production build
```

## License

[MIT](LICENSE)
