// src/client/pdf/pdfjs.ts
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Use CDN worker that matches the installed version
GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.js";

export { getDocument, GlobalWorkerOptions };
