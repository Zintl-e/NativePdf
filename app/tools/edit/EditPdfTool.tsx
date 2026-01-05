"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const Fonts = [
    { name: "Alex Brush", url: "https://fonts.gstatic.com/s/alexbrush/v22/SZc83FzrJKuqFbwMKk6EtUL57DtOmCc.ttf" },
    { name: "Allura", url: "https://fonts.gstatic.com/s/allura/v21/9oRPNYsQpS4zjuAPjAIXPtrrGA.ttf" },
    { name: "Arizonia", url: "https://fonts.gstatic.com/s/arizonia/v19/neIIzCemt4A5qa7mv6WGHK06UY30.ttf" },
    { name: "Dancing Script", url: "https://fonts.gstatic.com/s/dancingscript/v24/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSoHTeB9ptDqpw.ttf" },
    { name: "Herr Von Muellerhoff", url: "https://fonts.gstatic.com/s/herrvonmuellerhoff/v15/WBL6rFjRZkREW8WqmCWYLgCkQKXb4CAft3c6_qJY3QPQ.ttf" },
    { name: "Mr Dafoe", url: "https://fonts.gstatic.com/s/mrdafoe/v14/lJwE-pIzkS5NXuMMrGiqg7MCxz_C.ttf" },
    { name: "Pinyon Script", url: "https://fonts.gstatic.com/s/pinyonscript/v20/6xKpdSJbL9-e9LuoeQiDRQR8aOLQO4bhiDY.ttf" },
    { name: "Qwigley", url: "https://fonts.gstatic.com/s/qwigley/v17/1cXzaU3UGJb5tGoCuVxsi1mBmcE.ttf" },
    { name: "Rouge Script", url: "https://fonts.gstatic.com/s/rougescript/v14/LYjFdGbiklMoCIQOw1Ep3S4PVPXbUJWq9g.ttf" },
];

type Mode = "type" | "draw" | "upload";
type ResizeCorner = "nw" | "ne" | "sw" | "se";
type StretchEdge = "n" | "s" | "e" | "w";

// Store page dimensions for proper coordinate conversion
interface PageDimension {
    originalWidth: number;
    originalHeight: number;
    displayWidth: number;
    displayHeight: number;
    scale: number;
}

interface Point {
    x: number;
    y: number;
    pressure: number;
}

interface Text {
    id: number;
    type: Mode;
    content: string;
    font: number;
    fontName: string;
    color: string;
    opacity: number;
    size: number;
    bold: boolean;
    italic: boolean;
    boldness: number;
    pageIndex: number;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
    aspectRatio: number;
    rotation: number;
}

interface DraggingText extends Text {
    offsetX: number;
    offsetY: number;
    imgWidth: number;
    imgHeight: number;
}

interface ResizingText {
    id: number;
    pageIndex: number;
    corner: ResizeCorner;
    startX: number;
    startY: number;
    startWidthPercent: number;
    startHeightPercent: number;
    startXPercent: number;
    startYPercent: number;
}

interface StretchingText {
    id: number;
    pageIndex: number;
    edge: StretchEdge;
    startX: number;
    startY: number;
    startWidthPercent: number;
    startHeightPercent: number;
    startXPercent: number;
    startYPercent: number;
}

interface RotatingText extends Text {
    pageIndex: number;
}

interface PdfJsModule {
    getDocument: (params: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
    version: string;
    GlobalWorkerOptions: { workerSrc: string };
}

interface PdfDocument {
    numPages: number;
    getPage: (pageNum: number) => Promise<PdfPage>;
}

interface PdfPage {
    getViewport: (params: { scale: number }) => { width: number; height: number };
    render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
}

interface EmbeddedFont {
    widthOfTextAtSize: (text: string, size: number) => number;
    heightAtSize: (size: number) => number;
}

export default function EditPdfTool() {
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [mode, setMode] = useState<Mode>("type");
    const [TextName, setTextName] = useState("");
    const [selectedFont, setSelectedFont] = useState(0);
    const [TextColor, setTextColor] = useState("#000000");
    const [textSize, setTextSize] = useState(1.5);
    const [textBold, setTextBold] = useState(false);
    const [textItalic, setTextItalic] = useState(false);
    const [opacity, setOpacity] = useState(1);
    const [drawBoldness, setDrawBoldness] = useState(3);
    const [pdfPages, setPdfPages] = useState<string[]>([]);
    const [pageDimensions, setPageDimensions] = useState<PageDimension[]>([]);
    const [Texts, setTexts] = useState<Text[]>([]);
    const [draggingText, setDraggingText] = useState<DraggingText | null>(null);
    const [resizingText, setResizingText] = useState<ResizingText | null>(null);
    const [stretchingText, setStretchingText] = useState<StretchingText | null>(null);
    const [rotatingText, setRotatingText] = useState<RotatingText | null>(null);
    const [processing, setProcessing] = useState(false);
    const [pdfjs, setPdfjs] = useState<PdfJsModule | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [points, setPoints] = useState<Point[]>([]);
    const drawCanvasRef = useRef<HTMLCanvasElement>(null);
    const [drawnText, setDrawnText] = useState<string | null>(null);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [editingTextColor, setEditingTextColor] = useState<number | null>(null);

    const colorPresets = ["#000000", "#1E3A5F", "#0066CC", "#2E7D32", "#8B0000", "#4A148C", "#E65100", "#37474F"];

    const PDF_SCALE = 1.5;

    // Get actual pixel positions from percentages
    const getPixelPositions = useCallback((sig: Text, pageIndex: number) => {
        const img = imageRefs.current[pageIndex];
        if (!img) return { x: 0, y: 0, width: 100, height: 50 };

        const imgWidth = img.clientWidth;
        const imgHeight = img.clientHeight;

        return {
            x: sig.xPercent * imgWidth,
            y: sig.yPercent * imgHeight,
            width: sig.widthPercent * imgWidth,
            height: sig.heightPercent * imgHeight,
        };
    }, []);

    // Load Google Fonts for preview
    useEffect(() => {
        const loadFonts = async () => {
            const fontFaces = Fonts.map((font) => {
                const fontFace = new FontFace(font.name, `url(${font.url})`);
                return fontFace.load().then((loadedFont) => {
                    document.fonts.add(loadedFont);
                    return loadedFont;
                }).catch(err => {
                    console.warn(`Failed to load font ${font.name}:`, err);
                    return null;
                });
            });

            await Promise.all(fontFaces);
            setFontsLoaded(true);
        };

        loadFonts();
    }, []);

    useEffect(() => {
        if (!resizingText && !rotatingText && !stretchingText) return;

        const handleMouseMove = (e: MouseEvent) => {
            // Resize (proportional)
            if (resizingText) {
                const img = imageRefs.current[resizingText.pageIndex];
                if (!img) return;

                const dx = e.clientX - resizingText.startX;
                const dy = e.clientY - resizingText.startY;
                const imgWidth = img.clientWidth;
                const imgHeight = img.clientHeight;

                let deltaPercent = 0;

                switch (resizingText.corner) {
                    case 'se':
                        deltaPercent = (dx / imgWidth + dy / imgHeight) / 2;
                        break;
                    case 'nw':
                        deltaPercent = (-dx / imgWidth - dy / imgHeight) / 2;
                        break;
                    case 'ne':
                        deltaPercent = (dx / imgWidth - dy / imgHeight) / 2;
                        break;
                    case 'sw':
                        deltaPercent = (-dx / imgWidth + dy / imgHeight) / 2;
                        break;
                }

                const newWidthPercent = Math.max(0.05, Math.min(0.9, resizingText.startWidthPercent + deltaPercent));
                const aspectRatio = resizingText.startWidthPercent / resizingText.startHeightPercent;
                const newHeightPercent = newWidthPercent / aspectRatio;

                setTexts(prev =>
                    prev.map(sig =>
                        sig.id === resizingText.id
                            ? { ...sig, widthPercent: newWidthPercent, heightPercent: newHeightPercent }
                            : sig
                    )
                );
            }

            // Stretch (independent)
            if (stretchingText) {
                const img = imageRefs.current[stretchingText.pageIndex];
                if (!img) return;

                const dx = e.clientX - stretchingText.startX;
                const dy = e.clientY - stretchingText.startY;
                const imgWidth = img.clientWidth;
                const imgHeight = img.clientHeight;

                let newWidthPercent = stretchingText.startWidthPercent;
                let newHeightPercent = stretchingText.startHeightPercent;
                let newXPercent = stretchingText.startXPercent;
                let newYPercent = stretchingText.startYPercent;

                switch (stretchingText.edge) {
                    case 'e':
                        newWidthPercent = Math.max(0.05, stretchingText.startWidthPercent + dx / imgWidth);
                        break;
                    case 'w':
                        const deltaW = dx / imgWidth;
                        newWidthPercent = Math.max(0.05, stretchingText.startWidthPercent - deltaW);
                        newXPercent = stretchingText.startXPercent + deltaW;
                        break;
                    case 's':
                        newHeightPercent = Math.max(0.05, stretchingText.startHeightPercent + dy / imgHeight);
                        break;
                    case 'n':
                        const deltaH = dy / imgHeight;
                        newHeightPercent = Math.max(0.05, stretchingText.startHeightPercent - deltaH);
                        newYPercent = stretchingText.startYPercent + deltaH;
                        break;
                }

                setTexts(prev =>
                    prev.map(sig =>
                        sig.id === stretchingText.id
                            ? { ...sig, widthPercent: newWidthPercent, heightPercent: newHeightPercent, xPercent: newXPercent, yPercent: newYPercent }
                            : sig
                    )
                );
            }

            if (rotatingText) {
                const img = imageRefs.current[rotatingText.pageIndex];
                if (!img) return;

                const rect = img.getBoundingClientRect();
                const pixelPos = getPixelPositions(rotatingText, rotatingText.pageIndex);

                const centerX = pixelPos.x + pixelPos.width / 2;
                const centerY = pixelPos.y + pixelPos.height / 2;

                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);

                setTexts(prev =>
                    prev.map(sig =>
                        sig.id === rotatingText.id
                            ? { ...sig, rotation: angle }
                            : sig
                    )
                );
            }
        };

        const handleMouseUp = () => {
            setResizingText(null);
            setStretchingText(null);
            setRotatingText(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingText, rotatingText, stretchingText, getPixelPositions]);

    useEffect(() => {
        const initPdfJs = async () => {
            const pdfjsModule = await import("pdfjs-dist");
            pdfjsModule.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsModule.version}/build/pdf.worker.min.mjs`;
            setPdfjs(pdfjsModule as unknown as PdfJsModule);
        };
        initPdfJs();
    }, []);

    useEffect(() => {
        if (file && pdfjs) loadPdfPages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file, pdfjs]);

    const loadPdfPages = async () => {
        try {
            const arrayBuffer = await file!.arrayBuffer();
            const pdf = await pdfjs!.getDocument({ data: arrayBuffer }).promise;
            const pages: string[] = [];
            const dimensions: PageDimension[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: PDF_SCALE });
                const originalViewport = page.getViewport({ scale: 1 });

                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d")!;
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport }).promise;
                pages.push(canvas.toDataURL());

                dimensions.push({
                    originalWidth: originalViewport.width,
                    originalHeight: originalViewport.height,
                    displayWidth: viewport.width,
                    displayHeight: viewport.height,
                    scale: PDF_SCALE
                });
            }

            setPdfPages(pages);
            setPageDimensions(dimensions);
        } catch (err) {
            console.error("Failed to load PDF:", err);
            alert("Failed to load PDF");
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        setPoints([{ x, y, pressure: 0.5 + Math.random() * 0.3 }]);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !drawCanvasRef.current) return;

        const canvas = drawCanvasRef.current;
        const ctx = canvas.getContext("2d")!;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        const newPoints = [...points, { x, y, pressure: 0.5 + Math.random() * 0.3 }];
        setPoints(newPoints);

        if (newPoints.length > 1) {
            ctx.strokeStyle = TextColor;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.globalAlpha = opacity;

            const prev = newPoints[newPoints.length - 2];
            const curr = newPoints[newPoints.length - 1];

            ctx.beginPath();
            ctx.lineWidth = drawBoldness * curr.pressure;

            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        if (isDrawing && drawCanvasRef.current) {
            setDrawnText(drawCanvasRef.current.toDataURL());
        }
        setIsDrawing(false);
    };

    const clearDrawing = () => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setPoints([]);
        setDrawnText(null);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            setUploadedImage(result);
        };
        reader.readAsDataURL(uploadedFile);
    };

    const addTextToPage = async () => {
        let content: string | null = null;
        const type = mode;
        let aspectRatio = 3;

        if (mode === "type") {
            if (!TextName.trim()) {
                alert("Please enter your name first");
                return;
            }
            content = TextName.trim();
            aspectRatio = 3;
        } else if (mode === "draw") {
            if (!drawnText) {
                alert("Please draw your Text first");
                return;
            }
            content = drawnText;
            aspectRatio = 600 / 200;
        } else if (mode === "upload") {
            if (!uploadedImage) {
                alert("Please upload a Text image first");
                return;
            }
            content = uploadedImage;
            try {
                const img = new Image();
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => {
                        aspectRatio = img.width / img.height;
                        resolve();
                    };
                    img.onerror = reject;
                    img.src = uploadedImage;
                });
            } catch {
                aspectRatio = 2;
            }
        }

        if (!content) return;

        const baseWidthPercent = mode === "type" ? 0.3 : 0.25;
        const baseHeightPercent = baseWidthPercent / aspectRatio;

        const newText: Text = {
            id: Date.now(),
            type,
            content,
            font: selectedFont,
            fontName: Fonts[selectedFont].name,
            color: TextColor,
            opacity,
            size: textSize,
            bold: textBold,
            italic: textItalic,
            boldness: drawBoldness,
            pageIndex: 0,
            xPercent: 0.1,
            yPercent: 0.1,
            widthPercent: baseWidthPercent,
            heightPercent: baseHeightPercent,
            aspectRatio: aspectRatio,
            rotation: 0,
        };

        setTexts([...Texts, newText]);
    };

    const startDrag = (sig: Text, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const img = imageRefs.current[sig.pageIndex];
        if (!img) return;

        const rect = img.getBoundingClientRect();
        const pixelPos = getPixelPositions(sig, sig.pageIndex);
        const offsetX = e.clientX - rect.left - pixelPos.x;
        const offsetY = e.clientY - rect.top - pixelPos.y;
        setDraggingText({ ...sig, offsetX, offsetY, imgWidth: img.clientWidth, imgHeight: img.clientHeight });
    };

    const startResize = (
        sig: Text,
        corner: ResizeCorner,
        e: React.MouseEvent
    ) => {
        e.preventDefault();
        e.stopPropagation();

        setResizingText({
            id: sig.id,
            pageIndex: sig.pageIndex,
            corner,
            startX: e.clientX,
            startY: e.clientY,
            startWidthPercent: sig.widthPercent,
            startHeightPercent: sig.heightPercent,
            startXPercent: sig.xPercent,
            startYPercent: sig.yPercent
        });
    };

    const startStretch = (
        sig: Text,
        edge: StretchEdge,
        e: React.MouseEvent
    ) => {
        e.preventDefault();
        e.stopPropagation();

        setStretchingText({
            id: sig.id,
            pageIndex: sig.pageIndex,
            edge,
            startX: e.clientX,
            startY: e.clientY,
            startWidthPercent: sig.widthPercent,
            startHeightPercent: sig.heightPercent,
            startXPercent: sig.xPercent,
            startYPercent: sig.yPercent
        });
    };

    const startRotate = (sig: Text, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setRotatingText({ ...sig, pageIndex: sig.pageIndex });
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (draggingText) {
            // Find which page the mouse is over
            let targetPageIndex = draggingText.pageIndex;
            for (let i = 0; i < pdfPages.length; i++) {
                const img = imageRefs.current[i];
                if (img) {
                    const rect = img.getBoundingClientRect();
                    if (e.clientY >= rect.top && e.clientY <= rect.bottom &&
                        e.clientX >= rect.left && e.clientX <= rect.right) {
                        targetPageIndex = i;
                        break;
                    }
                }
            }

            const img = imageRefs.current[targetPageIndex];
            if (!img) return;

            const rect = img.getBoundingClientRect();
            const imgWidth = img.clientWidth;
            const imgHeight = img.clientHeight;

            const newX = e.clientX - rect.left - draggingText.offsetX;
            const newY = e.clientY - rect.top - draggingText.offsetY;

            const newXPercent = Math.max(0, Math.min(1 - draggingText.widthPercent, newX / imgWidth));
            const newYPercent = Math.max(0, Math.min(1 - draggingText.heightPercent, newY / imgHeight));

            setTexts(Texts.map(sig =>
                sig.id === draggingText.id
                    ? { ...sig, xPercent: newXPercent, yPercent: newYPercent, pageIndex: targetPageIndex }
                    : sig
            ));

            // Update dragging Text page index
            if (targetPageIndex !== draggingText.pageIndex) {
                setDraggingText({ ...draggingText, pageIndex: targetPageIndex });
            }
        } else if (rotatingText) {
            const img = imageRefs.current[rotatingText.pageIndex];
            if (!img) return;

            const rect = img.getBoundingClientRect();
            const pixelPos = getPixelPositions(rotatingText, rotatingText.pageIndex);
            const centerX = pixelPos.x + pixelPos.width / 2;
            const centerY = pixelPos.y + pixelPos.height / 2;
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
            setTexts(Texts.map(sig =>
                sig.id === rotatingText.id ? { ...sig, rotation: angle } : sig
            ));
        }
    };

    const onMouseUp = () => {
        setDraggingText(null);
        setResizingText(null);
        setStretchingText(null);
        setRotatingText(null);
    };

    const removeText = (id: number) => {
        setTexts(Texts.filter(sig => sig.id !== id));
    };

    const updateTextColor = (id: number, color: string) => {
        setTexts(Texts.map(sig =>
            sig.id === id ? { ...sig, color } : sig
        ));
    };

    const downloadPdf = async () => {
        if (!file || Texts.length === 0) {
            alert("Please add at least one Text");
            return;
        }

        setProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            pdfDoc.registerFontkit(fontkit);
            const pages = pdfDoc.getPages();

            const fontCache: { [key: number]: EmbeddedFont } = {};

            for (const sig of Texts) {
                const page = pages[sig.pageIndex] || pages[0];
                const { width: pageWidth, height: pageHeight } = page.getSize();

                // Convert percentage-based positions to actual PDF coordinates
                const pdfX = sig.xPercent * pageWidth;
                const pdfWidth = sig.widthPercent * pageWidth;
                const pdfHeight = sig.heightPercent * pageHeight;
                const pdfY = pageHeight - (sig.yPercent * pageHeight) - pdfHeight;

                const hex = sig.color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;

                // Calculate rotation center for proper rotation
                const centerX = pdfX + pdfWidth / 2;
                const centerY = pdfY + pdfHeight / 2;

                if (sig.type === "type") {
                    if (!fontCache[sig.font]) {
                        const fontUrl = Fonts[sig.font].url;
                        const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
                        fontCache[sig.font] = await pdfDoc.embedFont(fontBytes) as unknown as EmbeddedFont;
                    }
                    const font = fontCache[sig.font];

                    const baseFontSize = 24 * sig.size;
                    const textWidth = font.widthOfTextAtSize(sig.content, baseFontSize);
                    const textHeight = font.heightAtSize(baseFontSize);

                    const widthScale = pdfWidth / textWidth;
                    const heightScale = pdfHeight / textHeight;
                    const finalScale = Math.min(widthScale, heightScale) * 0.85;
                    const adjustedSize = baseFontSize * finalScale;

                    const finalTextWidth = font.widthOfTextAtSize(sig.content, adjustedSize);
                    const finalTextHeight = font.heightAtSize(adjustedSize);

                    // Calculate text position considering rotation
                    // For rotated text, we need to position it so it rotates around its center
                    const textX = centerX - finalTextWidth / 2;
                    const textY = centerY - finalTextHeight / 2;

                    page.drawText(sig.content, {
                        x: textX,
                        y: textY,
                        size: adjustedSize,
                        font: font as NonNullable<Parameters<typeof page.drawText>[1]>['font'],
                        color: rgb(r, g, b),
                        opacity: sig.opacity,
                        rotate: degrees(-sig.rotation),
                    });
                } else {
                    const imageBytes = await fetch(sig.content).then(res => res.arrayBuffer());
                    let image;

                    if (sig.content.includes('data:image/png')) {
                        image = await pdfDoc.embedPng(imageBytes);
                    } else if (sig.content.includes('data:image/jpeg') || sig.content.includes('data:image/jpg')) {
                        image = await pdfDoc.embedJpg(imageBytes);
                    } else {
                        image = await pdfDoc.embedPng(imageBytes);
                    }

                    // For images, use the stretched dimensions directly (no aspect ratio correction)
                    page.drawImage(image, {
                        x: pdfX,
                        y: pdfY,
                        width: pdfWidth,
                        height: pdfHeight,
                        opacity: sig.opacity,
                        rotate: degrees(-sig.rotation),
                    });
                }
            }

            const pdfBytes = await pdfDoc.save();

            const arrayBufferr: ArrayBuffer = Uint8Array.from(pdfBytes).buffer;

            const blob = new Blob([arrayBufferr], { type: "application/pdf" });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name.replace(".pdf", "-edited.pdf");
            a.click();
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error("Failed to edit PDF:", err);
            alert("Failed to edit PDF: " + (err as Error).message);
        } finally {
            setProcessing(false);
        }
    };

    const PenIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
    );

    const DocumentIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    );

    const ImageIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
        </svg>
    );

    return (
        <div className="flex flex-col items-center w-full pt-2 pb-8 px-4">
            <div className="max-w-[1200px] w-full flex flex-col gap-4">
                <a href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-black dark:hover:text-white transition-colors text-xs font-medium w-fit">
                    <span className="text-[16px]">←</span> Back to all tools
                </a>

                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-11 h-11 bg-black dark:bg-white rounded-lg text-white dark:text-black mx-auto">
                        <span className="material-symbols-outlined text-xl">edit_document</span>
                    </div>
                    <h1 className="text-xl font-black tracking-tight mt-2">Edit your Documets</h1>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Panel */}
                        <div className="flex flex-col gap-4 h-[800px] overflow-visible pr-2">
                            <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-lg p-6 transition-colors hover:border-black dark:hover:border-white cursor-pointer">
                                <input type="file" accept=".pdf" onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) { setFile(f); setTexts([]); }
                                }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <DocumentIcon />
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mt-2">Click or drag PDF</p>
                            </div>

                            <div className="flex gap-2">
                                {[{ m: "type", l: "Type" }, { m: "draw", l: "Draw" }, { m: "upload", l: "Upload" }].map(({ m, l }) => (
                                    <button key={m} onClick={() => setMode(m as Mode)}
                                        className={`flex-1 p-3 rounded-lg border-2 transition-all text-xs font-bold ${mode === m ? "border-black dark:border-white bg-gray-50 dark:bg-neutral-800" : "border-gray-200 dark:border-neutral-700"}`}>
                                        {l}
                                    </button>
                                ))}
                            </div>

                            {mode === "type" && (
                                <div className="flex flex-col gap-3">
                                    <input type="text" value={TextName} onChange={(e) => setTextName(e.target.value)}
                                        placeholder="Enter text" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none" />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Font Style */}
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                                                Font Style
                                            </label>
                                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                                {Fonts.map((font, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSelectedFont(idx)}
                                                        className={`p-2 rounded-lg border-2 transition-all text-left ${selectedFont === idx
                                                            ? "border-black dark:border-white bg-gray-50 dark:bg-neutral-800"
                                                            : "border-gray-200 dark:border-neutral-700"
                                                            }`}
                                                    >
                                                        <span
                                                            className="text-sm block truncate"
                                                            style={{ fontFamily: fontsLoaded ? `"${font.name}", cursive` : 'cursive' }}
                                                        >
                                                            {font.name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Color, Bold & Italic in one line */}
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                                                Style Options
                                            </label>
                                            <div className="flex gap-2 items-center">
                                                <div className="relative flex-1">
                                                    <button
                                                        onClick={() => setShowColorPicker(!showColorPicker)}
                                                        className="w-full h-10 rounded-lg border-2 border-gray-200 dark:border-neutral-700 flex items-center gap-2 px-2 hover:border-black dark:hover:border-white transition-colors"
                                                    >
                                                        <div
                                                            className="w-6 h-6 rounded-md border-2 border-gray-300 dark:border-neutral-600"
                                                            style={{ backgroundColor: TextColor }}
                                                        ></div>
                                                        <span className="text-xs font-mono">{TextColor}</span>
                                                    </button>
                                                    {showColorPicker && (
                                                        <div className="absolute z-20 mt-2 p-3 bg-white dark:bg-neutral-800 border-2 border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg">
                                                            <div className="grid grid-cols-4 gap-2 mb-3">
                                                                {colorPresets.map(color => (
                                                                    <button
                                                                        key={color}
                                                                        onClick={() => {
                                                                            setTextColor(color);
                                                                            setShowColorPicker(false);
                                                                        }}
                                                                        className="w-8 h-8 rounded-md border-2 border-gray-300 dark:border-neutral-600 hover:scale-110 transition-transform"
                                                                        style={{ backgroundColor: color }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <input
                                                                type="color"
                                                                value={TextColor}
                                                                onChange={(e) => setTextColor(e.target.value)}
                                                                className="w-full h-8 rounded cursor-pointer"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => setTextBold(!textBold)}
                                                    className={`px-4 py-2 rounded-lg border-2 text-xs font-bold transition-all ${textBold ? "border-black dark:border-white bg-gray-50 dark:bg-neutral-800" : "border-gray-200 dark:border-neutral-700"
                                                        }`}
                                                >
                                                    Bold
                                                </button>
                                                <button
                                                    onClick={() => setTextItalic(!textItalic)}
                                                    className={`px-4 py-2 rounded-lg border-2 text-xs font-bold italic transition-all ${textItalic ? "border-black dark:border-white bg-gray-50 dark:bg-neutral-800" : "border-gray-200 dark:border-neutral-700"
                                                        }`}
                                                >
                                                    Italic
                                                </button>
                                            </div>
                                        </div>

                                        {/* Size & Opacity in one line */}
                                        <div className="col-span-1 md:col-span-2">
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                                                        Size: {textSize.toFixed(1)}x
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0.5"
                                                        max="3"
                                                        step="0.1"
                                                        value={textSize}
                                                        onChange={(e) => setTextSize(parseFloat(e.target.value))}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                                                        Opacity: {opacity.toFixed(1)}
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0.1"
                                                        max="1"
                                                        step="0.1"
                                                        value={opacity}
                                                        onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                                        className="w-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Preview */}
                                        {TextName && (
                                            <div className="col-span-1 md:col-span-2 p-11 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-100 dark:border-neutral-800 flex justify-center items-center relative">
                                                <span className="text-[10px] text-gray-500 absolute top-1 left-1 uppercase tracking-wider font-bold">
                                                    Preview:
                                                </span>
                                                <div
                                                    style={{
                                                        fontFamily: fontsLoaded ? `"${Fonts[selectedFont].name}", cursive` : 'cursive',
                                                        color: TextColor,
                                                        transform: `scale(${textSize})`,
                                                        transformOrigin: 'top center',
                                                        fontWeight: textBold ? 'bold' : 'normal',
                                                        fontStyle: textItalic ? 'italic' : 'normal',
                                                        opacity: opacity,
                                                    }}
                                                    className="text-center"
                                                >
                                                    {TextName}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {mode === "draw" && (
                                <div className="flex flex-col gap-3">
                                    {/* Color, Pen Stroke & Opacity in organized layout */}
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">Color Presets</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {colorPresets.map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setTextColor(color)}
                                                    className={`w-8 h-8 rounded-md border-2 hover:scale-110 transition-transform ${TextColor === color ? 'border-black dark:border-white' : 'border-gray-300 dark:border-neutral-600'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                            <div className="relative">
                                                <input
                                                    type="color"
                                                    value={TextColor}
                                                    onChange={(e) => setTextColor(e.target.value)}
                                                    className="w-8 h-8 rounded-md cursor-pointer border-2 border-gray-300 dark:border-neutral-600"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Size & Opacity in one line */}
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">Pen Stroke: {drawBoldness}px</label>
                                            <input type="range" min="1" max="10" step="1" value={drawBoldness} onChange={(e) => setDrawBoldness(parseInt(e.target.value))} className="w-full" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">Opacity: {opacity.toFixed(1)}</label>
                                            <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">Draw Your Text</label>
                                        <canvas ref={drawCanvasRef} width={600} height={200} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                                            className="w-full border-2 border-dashed border-gray-300 dark:border-neutral-600 rounded-lg cursor-crosshair bg-white" style={{ touchAction: 'none' }} />
                                        <button onClick={clearDrawing} className="mt-2 text-xs text-red-600 hover:text-red-700 font-bold">Clear Drawing</button>
                                    </div>
                                </div>
                            )}

                            {mode === "upload" && (
                                <div className="flex flex-col gap-3">
                                    <div className="relative group flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-lg p-6 transition-colors hover:border-black dark:hover:border-white cursor-pointer">
                                        <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <ImageIcon />
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mt-2">Click or drag image</p>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">Opacity: {opacity.toFixed(1)}</label>
                                        <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full" />
                                    </div>

                                    {uploadedImage && (
                                        <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-100 dark:border-neutral-800">
                                            <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider font-bold">Preview:</p>
                                            <img src={uploadedImage} alt="Text" className="max-w-full h-auto rounded" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {file && (
                                <button
                                    onClick={addTextToPage}
                                    disabled={!file || !TextName}
                                    className="w-full py-2.5 rounded-lg text-xs font-bold transition-all 
                                           bg-black text-white hover:opacity-90 dark:bg-white dark:text-black shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    Add Text to Page
                                </button>
                            )}

                        </div>

                        {/* Right Panel */}
                        <div className="flex flex-col gap-3 h-[800px]">
                            {!file ? (
                                <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-lg">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-neutral-800 rounded-lg text-gray-400">
                                            <DocumentIcon />
                                        </div>
                                        <p className="text-sm text-gray-400 mt-2 text-center">
                                            Upload a PDF to get started
                                        </p>
                                    </div>
                                </div>
                            ) : pdfPages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-black dark:border-white border-t-transparent"></div>
                                </div>
                            ) : (
                                <>
                                    <div ref={canvasRef} className="relative border-2 border-gray-200 dark:border-neutral-700 rounded-lg overflow-y-auto h-full bg-gray-50 dark:bg-neutral-800 pb-4 flex flex-col gap-4"
                                        onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
                                        {pdfPages.map((page, pageIndex) => (
                                            <div
                                                key={pageIndex}
                                                ref={el => { pageRefs.current[pageIndex] = el; }}
                                                className="relative"
                                                style={{ width: '100%' }}
                                            >
                                                {/* Page number at top-right */}
                                                <div className="absolute top-2 right-2 bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 text-xs font-bold px-2 py-1 rounded shadow">
                                                    Page {pageIndex + 1}
                                                </div>

                                                <img
                                                    ref={el => { imageRefs.current[pageIndex] = el; }}
                                                    src={page}
                                                    alt={`Page ${pageIndex + 1}`}
                                                    className="w-full pointer-events-none"
                                                    draggable={false}
                                                />
                                                {Texts.filter(sig => sig.pageIndex === pageIndex).map(sig => {
                                                    return (
                                                        <div key={sig.id} data-sig-id={sig.id} className="absolute cursor-move group"
                                                            style={{
                                                                left: `${sig.xPercent * 100}%`,
                                                                top: `${sig.yPercent * 100}%`,
                                                                width: `${sig.widthPercent * 100}%`,
                                                                height: `${sig.heightPercent * 100}%`,
                                                                transform: `rotate(${sig.rotation}deg)`,
                                                                transformOrigin: 'center',
                                                            }}
                                                            onMouseDown={(e) => startDrag(sig, e)}>

                                                            <div className="w-full h-full flex items-center justify-center bg-transparent border-2 border-transparent rounded-lg hover:shadow-md transition-shadow group-hover:border-blue-500 overflow-hidden">
                                                                {sig.type === "type" ? (
                                                                    <svg
                                                                        width="100%"
                                                                        height="100%"
                                                                        viewBox="0 0 200 50"
                                                                        preserveAspectRatio="xMidYMid meet"
                                                                        style={{ opacity: sig.opacity }}
                                                                        className="select-none"
                                                                    >
                                                                        <text
                                                                            x="50%"
                                                                            y="50%"
                                                                            dominantBaseline="middle"
                                                                            textAnchor="middle"
                                                                            fill={sig.color}
                                                                            fontFamily={fontsLoaded ? `"${sig.fontName}", cursive` : 'cursive'}
                                                                            fontWeight={sig.bold ? 'bold' : 'normal'}
                                                                            fontStyle={sig.italic ? 'italic' : 'normal'}
                                                                            fontSize={24 * sig.size}
                                                                        >
                                                                            {sig.content}
                                                                        </text>
                                                                    </svg>
                                                                ) : (
                                                                    <img
                                                                        src={sig.content}
                                                                        alt="Text"
                                                                        style={{
                                                                            width: '100%',
                                                                            height: '100%',
                                                                            objectFit: 'fill',
                                                                            opacity: sig.opacity,
                                                                        }}
                                                                        draggable={false}
                                                                    />
                                                                )}
                                                            </div>

                                                            {/* Corner Resize handles (proportional) */}
                                                            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 cursor-nw-resize" onMouseDown={(e) => startResize(sig, 'nw', e)}></div>
                                                            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 cursor-ne-resize" onMouseDown={(e) => startResize(sig, 'ne', e)}></div>
                                                            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 cursor-sw-resize" onMouseDown={(e) => startResize(sig, 'sw', e)}></div>
                                                            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 cursor-se-resize" onMouseDown={(e) => startResize(sig, 'se', e)}></div>

                                                            {/* Edge Stretch handles (independent stretch) */}
                                                            <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-6 bg-green-500 rounded-sm opacity-0 group-hover:opacity-100 cursor-ew-resize" onMouseDown={(e) => startStretch(sig, 'w', e)}></div>
                                                            <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-6 bg-green-500 rounded-sm opacity-0 group-hover:opacity-100 cursor-ew-resize" onMouseDown={(e) => startStretch(sig, 'e', e)}></div>
                                                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-2 bg-green-500 rounded-sm opacity-0 group-hover:opacity-100 cursor-ns-resize" onMouseDown={(e) => startStretch(sig, 'n', e)}></div>
                                                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-2 bg-green-500 rounded-sm opacity-0 group-hover:opacity-100 cursor-ns-resize" onMouseDown={(e) => startStretch(sig, 's', e)}></div>

                                                            <button
                                                                onClick={() => removeText(sig.id)}
                                                                className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm font-bold shadow-lg z-10"
                                                            >×</button>

                                                            <div className="col-span-1 md:col-span-2">
                                                                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                                                                    Style Options
                                                                </label>

                                                                {/* Preview */}
                                                                <div className="w-full h-10 rounded-lg border-2 border-gray-200 dark:border-neutral-700 flex items-center gap-2 px-2 mb-3">
                                                                    <div
                                                                        className="w-6 h-6 rounded-md border-2 border-gray-300 dark:border-neutral-600"
                                                                        style={{ backgroundColor: TextColor }}
                                                                    />
                                                                    <span className="text-xs font-mono">{TextColor}</span>
                                                                </div>

                                                                {/* Picker + presets (always visible) */}
                                                                <div className="p-3 bg-white dark:bg-neutral-800 border-2 border-gray-200 dark:border-neutral-700 rounded-lg">
                                                                    <div className="relative">
                                                                        <input
                                                                            type="color"
                                                                            value={TextColor}
                                                                            onChange={(e) => setTextColor(e.target.value)}
                                                                            className="w-full h-9 rounded cursor-pointer pr-20"
                                                                        />

                                                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                                                                            {colorPresets.slice(0, 6).map((color) => (
                                                                                <button
                                                                                    key={color}
                                                                                    type="button"
                                                                                    onClick={() => setTextColor(color)}
                                                                                    className="w-4 h-4 rounded-full border border-gray-300 dark:border-neutral-600 hover:scale-110 transition"
                                                                                    style={{ backgroundColor: color }}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onMouseDown={(e) => startRotate(sig, e)}
                                                                className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs shadow-lg z-10"
                                                                title="Rotate"
                                                            >↻</button>

                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>

                                    <button onClick={downloadPdf} disabled={processing || Texts.length === 0}
                                        className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${processing || Texts.length === 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"}`}>
                                        {processing ? "Processing..." : "Download PDF"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}