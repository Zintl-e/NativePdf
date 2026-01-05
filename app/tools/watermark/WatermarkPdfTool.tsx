'use client'

import { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import Link from 'next/link';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type WatermarkPattern = 'single' | 'grid';

export default function Watermarker() {
  const [files, setFiles] = useState<File[]>([]);
  const [wmText, setWmText] = useState('CONFIDENTIAL');
  const [wmSize, setWmSize] = useState(48);
  const [wmOpacity, setWmOpacity] = useState(0.4);
  const [wmRotate, setWmRotate] = useState(45);
  const [wmColor, setWmColor] = useState('#ef4444');
  const [wmPattern, setWmPattern] = useState<WatermarkPattern>('single');
  const [wmGap, setWmGap] = useState(150); 
  const [previewBg, setPreviewBg] = useState<HTMLImageElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [statusDone, setStatusDone] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (files.length === 0) {
      setPreviewBg(null);
      return;
    }

    const generatePreviewBg = async () => {
      const firstFile = files[0];
      try {
        if (firstFile.type === 'application/pdf') {
          const arrayBuffer = await firstFile.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          const img = new Image();
          img.src = canvas.toDataURL();
          img.onload = () => setPreviewBg(img);
        } else if (firstFile.type.startsWith('image/')) {
          const img = new Image();
          img.src = URL.createObjectURL(firstFile);
          img.onload = () => setPreviewBg(img);
        }
      } catch (e) {
        console.error("Preview generation failed", e);
      }
    };
    generatePreviewBg();
  }, [files]);

  // Draw Live Preview 
  useEffect(() => {
    if (!previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (previewBg) {
      const hRatio = canvas.width / previewBg.width;
      const vRatio = canvas.height / previewBg.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShift_x = (canvas.width - previewBg.width * ratio) / 2;
      const centerShift_y = (canvas.height - previewBg.height * ratio) / 2;
      ctx.drawImage(previewBg, 0, 0, previewBg.width, previewBg.height,
        centerShift_x, centerShift_y, previewBg.width * ratio, previewBg.height * ratio);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const scaleFactor = 0.5;
    ctx.font = `bold ${wmSize * scaleFactor}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = wmColor;
    ctx.globalAlpha = wmOpacity;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const drawTextRotated = (x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((wmRotate * Math.PI) / 180);
      ctx.fillText(wmText, 0, 0);
      ctx.restore();
    };

    if (wmPattern === 'single') {
      drawTextRotated(canvas.width / 2, canvas.height / 2);
    } else {
      // Use wmGap for the grid spacing (scaled for preview)
      const visualGap = wmGap * scaleFactor;
      for (let x = 0; x <= canvas.width + visualGap; x += visualGap) {
        for (let y = 0; y <= canvas.height + visualGap; y += visualGap) {
          drawTextRotated(x, y);
        }
      }
    }
    ctx.globalAlpha = 1.0;
  }, [wmText, wmSize, wmOpacity, wmRotate, wmColor, wmPattern, wmGap, previewBg]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList) return;
    setFiles(prev => [...prev, ...Array.from(filesList)]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setStatusDone(false);
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    } : { r: 0, g: 0, b: 0 };
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setStatusDone(false);
    try {
      for (const file of files) {
        if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          const color = hexToRgb(wmColor);

          pdfDoc.getPages().forEach(page => {
            const { width, height } = page.getSize();
            const config = {
              size: wmSize,
              font,
              color: rgb(color.r, color.g, color.b),
              opacity: wmOpacity,
              rotate: degrees(wmRotate)
            };

            if (wmPattern === 'single') {
              page.drawText(wmText, {
                x: width / 2 - (font.widthOfTextAtSize(wmText, wmSize) / 2),
                y: height / 2,
                ...config
              });
            } else {
              // Grid logic using the wmGap value
              for (let x = 0; x < width + wmGap; x += wmGap) {
                for (let y = 0; y < height + wmGap; y += wmGap) {
                  page.drawText(wmText, { x, y, ...config });
                }
              }
            }
          });

          const pdfBytes = await pdfDoc.save();

          const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `watermarked_${file.name}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
      setStatusDone(true);
    } catch (e) {
      alert('Error processing files.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full pt-2 pb-8 px-4 relative">
      <div className="max-w-[1024px] w-full flex flex-col gap-4">
        <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-black dark:hover:text-white transition-colors text-xs font-medium w-fit">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to all tools
        </Link>

        <div className="text-center pt-5">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-black dark:bg-white rounded-lg text-white dark:text-black mx-auto">
            <span className="material-symbols-outlined text-xl">branding_watermark</span>
          </div>
          <h1 className="text-xl font-black tracking-tight mt-2 uppercase">Watermarker Pro</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">First-page live preview • Client-side processing</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-8 items-stretch transition-all duration-300 ease-out">

          {/* LEFT COLUMN: UPLOAD & FILES */}
          <div className="flex-[1.2] w-full flex flex-col gap-6">
            <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-lg transition-colors hover:border-black dark:hover:border-white cursor-pointer p-16">
              <input type="file" accept="application/pdf,image/*" multiple onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <span className="material-symbols-outlined text-3xl text-gray-300 group-hover:text-black dark:group-hover:text-white mb-2">cloud_upload</span>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Add Files</p>
            </div>

            {files.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Selected Files ({files.length})</p>
                <div className="max-h-[300px] overflow-y-auto pr-2 flex flex-col gap-2 custom-scrollbar">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-800 rounded-lg">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="material-symbols-outlined text-gray-400 text-sm">description</span>
                        <span className="text-xs font-medium truncate pr-4">{f.name}</span>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Text</label>
                <input type="text" value={wmText} onChange={(e) => setWmText(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Pattern</label>
                  <select value={wmPattern} onChange={(e) => setWmPattern(e.target.value as WatermarkPattern)} className="w-full bg-white dark:bg-neutral-900 rounded-lg px-2 py-2 text-xs border border-gray-200 dark:border-neutral-700">
                    <option value="single">Single</option>
                    <option value="grid">Grid</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Color</label>
                  <input type="color" value={wmColor} onChange={(e) => setWmColor(e.target.value)} className="w-full h-8 bg-transparent cursor-pointer rounded overflow-hidden border-none" />
                </div>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase"><span>Size</span><span>{wmSize}px</span></div>
                <input type="range" min="10" max="150" value={wmSize} onChange={(e) => setWmSize(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white" />
              </div>

              {/* DYNAMIC GAP OPTION */}
              {wmPattern === 'grid' && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase"><span>Spacing (Gap)</span><span>{wmGap}px</span></div>
                  <input type="range" min="50" max="400" value={wmGap} onChange={(e) => setWmGap(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase"><span>Opacity</span><span>{wmOpacity}</span></div>
                  <input type="range" min="0.1" max="1" step="0.1" value={wmOpacity} onChange={(e) => setWmOpacity(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase"><span>Rotation</span><span>{wmRotate}°</span></div>
                  <input type="range" min="-180" max="180" value={wmRotate} onChange={(e) => setWmRotate(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white" />
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: PREVIEW & SETTINGS */}
          <div className="flex-1 w-full flex flex-col">
            <div className="relative flex-1">
              {/* EMPTY STATE */}
              <div className={`absolute inset-0 h-full transition-all duration-300 ease-out ${files.length === 0 ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <div className="h-full border border-dashed border-gray-100 dark:border-neutral-800 rounded-xl flex flex-col items-center justify-center p-10 text-center">
                  <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">visibility_off</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Waiting for files</p>
                </div>
              </div>

              {/* CONTROLS */}
              <div className={`h-full transition-all duration-300 ease-out flex flex-col gap-4 ${files.length > 0 ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                {/* Preview Window */}
                <div className="bg-gray-100 dark:bg-neutral-950 rounded-xl border border-gray-200 dark:border-neutral-800 flex items-center justify-center p-4 min-h-[250px]">
                  <canvas ref={previewCanvasRef} width={400} height={520} className="max-w-full h-auto shadow-xl rounded bg-white" />
                </div>

                <div className="flex-1 bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-gray-100 dark:border-neutral-800 flex flex-col gap-4">
                  <button
                    onClick={processFiles}
                    disabled={loading || files.length === 0}
                    className={`w-full py-4 mt-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2
                      ${loading ? "bg-gray-100 text-gray-400" : "bg-black text-white dark:bg-white dark:text-black hover:scale-[1.01]"}`}
                  >
                    {loading ? <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">download</span>}
                    {loading ? "Processing..." : "Download Files"}
                  </button>
                </div>

                {statusDone && (
                  <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/50 p-4 rounded-xl flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-600">verified</span>
                    <p className="text-[11px] font-bold text-green-700 dark:text-green-400">Success! Files downloaded.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}