import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Type, 
  Square, 
  Circle, 
  Minus, 
  Highlighter,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Move,
  Loader2,
  Palette,
  Copy,
  Scissors,
  Clipboard,
  Undo,
  Redo
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface EditPdfEditorProps {
  files: File[];
  onOptionsChange: (options: any) => void;
}

type ToolType = "select" | "text" | "rectangle" | "circle" | "line" | "highlight" | "freehand" | "snip";
type SnipShape = "rectangle" | "square" | "circle" | "freehand";

interface Annotation {
  id: string;
  type: ToolType | "image";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color: string;
  fillColor?: string;
  filled?: boolean;
  fontSize?: number;
  fontFamily?: string;
  points?: { x: number; y: number }[];
  endX?: number;
  endY?: number;
  imageData?: string;
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | null;

const FONTS = [
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
  { value: "Comic Sans MS", label: "Comic Sans" },
  { value: "Impact", label: "Impact" },
];

const PRESET_COLORS = [
  "#ff0000", "#ff6b00", "#ffff00", "#00ff00", "#00ffff", 
  "#0000ff", "#ff00ff", "#000000", "#666666", "#ffffff"
];

export function EditPdfEditor({ files, onOptionsChange }: EditPdfEditorProps) {
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImage, setPageImage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolType>("select");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentColor, setCurrentColor] = useState("#ff0000");
  const [currentFillColor, setCurrentFillColor] = useState("#ff0000");
  const [fillEnabled, setFillEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textInput, setTextInput] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; ann: Annotation } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<"stroke" | "fill">("stroke");
  const [customColor, setCustomColor] = useState("#ff0000");
  const [clipboard, setClipboard] = useState<string | null>(null);
  const [snipSelection, setSnipSelection] = useState<{ x: number; y: number; width: number; height: number; shape: SnipShape; points?: {x: number; y: number}[] } | null>(null);
  const [isSnipping, setIsSnipping] = useState(false);
  const [snipStart, setSnipStart] = useState<{ x: number; y: number } | null>(null);
  const [snipShape, setSnipShape] = useState<SnipShape>("rectangle");
  const [snipPoints, setSnipPoints] = useState<{ x: number; y: number }[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const onOptionsChangeRef = useRef(onOptionsChange);
  const initializedRef = useRef(false);

  onOptionsChangeRef.current = onOptionsChange;

  useEffect(() => {
    if (files.length === 0 || initializedRef.current) return;
    initializedRef.current = true;

    const loadPdf = async () => {
      setLoading(true);
      try {
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pdfDocRef.current = pdf;
        setPageCount(pdf.numPages);
        
        const page = await pdf.getPage(1);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport } as any).promise;
        setPageImage(canvas.toDataURL("image/png"));
      } catch (error) {
        console.error("Error loading PDF:", error);
      }
      setLoading(false);
    };

    loadPdf();
  }, [files]);

  const renderCurrentPage = useCallback(async () => {
    if (!pdfDocRef.current) return;
    
    setLoading(true);
    try {
      const page = await pdfDocRef.current.getPage(currentPage);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport } as any).promise;
      setPageImage(canvas.toDataURL("image/png"));
    } catch (error) {
      console.error("Error rendering page:", error);
    }
    setLoading(false);
  }, [currentPage]);

  const changePage = (newPage: number) => {
    if (newPage >= 1 && newPage <= pageCount && newPage !== currentPage) {
      setCurrentPage(newPage);
      setSelectedId(null);
    }
  };

  useEffect(() => {
    if (pdfDocRef.current && currentPage > 0) {
      renderCurrentPage();
    }
  }, [currentPage, renderCurrentPage]);

  useEffect(() => {
    onOptionsChangeRef.current({ annotations, pageCount });
  }, [annotations, pageCount]);

  const getRelativePosition = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const saveToHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newAnnotations]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations([...history[historyIndex - 1]]);
      setSelectedId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations([...history[historyIndex + 1]]);
      setSelectedId(null);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const getResizeHandleAtPosition = (ann: Annotation, pos: { x: number; y: number }): ResizeHandle => {
    const handleSize = 8;
    const { x, y, width, height } = ann;
    
    const handles: { handle: ResizeHandle; hx: number; hy: number }[] = [
      { handle: "nw", hx: x, hy: y },
      { handle: "n", hx: x + width / 2, hy: y },
      { handle: "ne", hx: x + width, hy: y },
      { handle: "e", hx: x + width, hy: y + height / 2 },
      { handle: "se", hx: x + width, hy: y + height },
      { handle: "s", hx: x + width / 2, hy: y + height },
      { handle: "sw", hx: x, hy: y + height },
      { handle: "w", hx: x, hy: y + height / 2 },
    ];

    for (const { handle, hx, hy } of handles) {
      if (Math.abs(pos.x - hx) <= handleSize && Math.abs(pos.y - hy) <= handleSize) {
        return handle;
      }
    }
    return null;
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging || resizeHandle || isSnipping) return;
    
    const pos = getRelativePosition(e);

    if (selectedTool === "text") {
      setTextPosition(pos);
      setShowTextInput(true);
      return;
    }

    if (selectedTool === "select") {
      const clicked = [...annotations].reverse().find(
        (a) =>
          a.page === currentPage &&
          pos.x >= a.x &&
          pos.x <= a.x + a.width &&
          pos.y >= a.y &&
          pos.y <= a.y + a.height
      );
      setSelectedId(clicked?.id || null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getRelativePosition(e);

    if (selectedTool === "snip") {
      setIsSnipping(true);
      setSnipStart(pos);
      setSnipSelection(null);
      if (snipShape === "freehand") {
        setSnipPoints([pos]);
      }
      return;
    }

    if (selectedTool === "select" && selectedId) {
      const selected = annotations.find(a => a.id === selectedId);
      if (selected && selected.page === currentPage) {
        const handle = getResizeHandleAtPosition(selected, pos);
        if (handle) {
          setResizeHandle(handle);
          setResizeStart({ x: pos.x, y: pos.y, ann: { ...selected } });
          return;
        }
        
        if (pos.x >= selected.x && pos.x <= selected.x + selected.width &&
            pos.y >= selected.y && pos.y <= selected.y + selected.height) {
          setIsDragging(true);
          setDragOffset({ x: pos.x - selected.x, y: pos.y - selected.y });
          return;
        }
      }
    }

    if (selectedTool !== "select" && selectedTool !== "text" && selectedTool !== "snip") {
      setIsDrawing(true);
      setDrawStart(pos);
      
      if (selectedTool === "freehand") {
        setCurrentPoints([pos]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getRelativePosition(e);

    if (isDragging && selectedId) {
      setAnnotations(prev => prev.map(a => 
        a.id === selectedId 
          ? { ...a, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y }
          : a
      ));
      return;
    }

    if (resizeHandle && resizeStart && selectedId) {
      const { ann } = resizeStart;
      let newX = ann.x, newY = ann.y, newWidth = ann.width, newHeight = ann.height;
      
      const dx = pos.x - resizeStart.x;
      const dy = pos.y - resizeStart.y;

      switch (resizeHandle) {
        case "nw":
          newX = ann.x + dx;
          newY = ann.y + dy;
          newWidth = ann.width - dx;
          newHeight = ann.height - dy;
          break;
        case "n":
          newY = ann.y + dy;
          newHeight = ann.height - dy;
          break;
        case "ne":
          newY = ann.y + dy;
          newWidth = ann.width + dx;
          newHeight = ann.height - dy;
          break;
        case "e":
          newWidth = ann.width + dx;
          break;
        case "se":
          newWidth = ann.width + dx;
          newHeight = ann.height + dy;
          break;
        case "s":
          newHeight = ann.height + dy;
          break;
        case "sw":
          newX = ann.x + dx;
          newWidth = ann.width - dx;
          newHeight = ann.height + dy;
          break;
        case "w":
          newX = ann.x + dx;
          newWidth = ann.width - dx;
          break;
      }

      if (newWidth > 10 && newHeight > 10) {
        setAnnotations(prev => prev.map(a => 
          a.id === selectedId 
            ? { ...a, x: newX, y: newY, width: newWidth, height: newHeight }
            : a
        ));
      }
      return;
    }

    if (isSnipping && snipStart) {
      if (snipShape === "freehand") {
        setSnipPoints(prev => [...prev, pos]);
      } else {
        let x = Math.min(snipStart.x, pos.x);
        let y = Math.min(snipStart.y, pos.y);
        let width = Math.abs(pos.x - snipStart.x);
        let height = Math.abs(pos.y - snipStart.y);
        
        if (snipShape === "square" || snipShape === "circle") {
          const size = Math.max(width, height);
          width = size;
          height = size;
        }
        
        setSnipSelection({ x, y, width, height, shape: snipShape });
      }
      return;
    }

    if (isDrawing && selectedTool === "freehand") {
      setCurrentPoints(prev => [...prev, pos]);
    }
  };

  const captureSnipSelection = () => {
    if (!imageRef.current || !pageImage) return;
    
    const img = imageRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    
    if (snipShape === "freehand" && snipPoints.length > 2) {
      const minX = Math.min(...snipPoints.map(p => p.x));
      const maxX = Math.max(...snipPoints.map(p => p.x));
      const minY = Math.min(...snipPoints.map(p => p.y));
      const maxY = Math.max(...snipPoints.map(p => p.y));
      const width = maxX - minX;
      const height = maxY - minY;
      
      canvas.width = width * scaleX;
      canvas.height = height * scaleY;
      
      ctx.save();
      ctx.beginPath();
      snipPoints.forEach((p, i) => {
        const px = (p.x - minX) * scaleX;
        const py = (p.y - minY) * scaleY;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.clip();
      
      ctx.drawImage(img, minX * scaleX, minY * scaleY, width * scaleX, height * scaleY, 0, 0, width * scaleX, height * scaleY);
      ctx.restore();
      
      const imageData = canvas.toDataURL("image/png");
      setClipboard(imageData);
      setSnipPoints([]);
    } else if (snipSelection) {
      const sx = snipSelection.x * scaleX;
      const sy = snipSelection.y * scaleY;
      const sw = snipSelection.width * scaleX;
      const sh = snipSelection.height * scaleY;
      
      canvas.width = sw;
      canvas.height = sh;
      
      if (snipSelection.shape === "circle") {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(sw / 2, sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        ctx.restore();
      } else {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      }
      
      const imageData = canvas.toDataURL("image/png");
      setClipboard(imageData);
      setSnipSelection(null);
    }
    
    setIsSnipping(false);
    setSnipStart(null);
  };

  const pasteClipboard = () => {
    if (!clipboard) return;
    
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      type: "image",
      page: currentPage,
      x: 50,
      y: 50,
      width: 150,
      height: 150,
      color: "transparent",
      imageData: clipboard,
    };
    
    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
    setSelectedId(newAnnotation.id);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (resizeHandle) {
      setResizeHandle(null);
      setResizeStart(null);
      return;
    }

    if (isSnipping && snipStart) {
      const pos = getRelativePosition(e);
      
      if (snipShape === "freehand") {
        if (snipPoints.length > 2) {
          setSnipPoints(prev => [...prev, prev[0]]);
        }
      } else {
        let x = Math.min(snipStart.x, pos.x);
        let y = Math.min(snipStart.y, pos.y);
        let width = Math.abs(pos.x - snipStart.x);
        let height = Math.abs(pos.y - snipStart.y);
        
        if (snipShape === "square" || snipShape === "circle") {
          const size = Math.max(width, height);
          width = size;
          height = size;
        }
        
        if (width > 10 && height > 10) {
          setSnipSelection({ x, y, width, height, shape: snipShape });
        }
      }
      setIsSnipping(false);
      return;
    }

    if (!isDrawing || !drawStart) return;
    
    const pos = getRelativePosition(e);
    const width = Math.abs(pos.x - drawStart.x);
    const height = Math.abs(pos.y - drawStart.y);
    
    if (width < 5 && height < 5 && selectedTool !== "freehand") {
      setIsDrawing(false);
      setDrawStart(null);
      return;
    }

    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      type: selectedTool,
      page: currentPage,
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      width: width || 100,
      height: height || 50,
      color: currentColor,
      fillColor: currentFillColor,
      filled: fillEnabled,
      fontSize,
      fontFamily,
    };

    if (selectedTool === "line") {
      newAnnotation.x = drawStart.x;
      newAnnotation.y = drawStart.y;
      newAnnotation.endX = pos.x;
      newAnnotation.endY = pos.y;
      newAnnotation.width = Math.abs(pos.x - drawStart.x);
      newAnnotation.height = Math.abs(pos.y - drawStart.y);
    }

    if (selectedTool === "freehand" && currentPoints.length > 0) {
      const minX = Math.min(...currentPoints.map(p => p.x));
      const maxX = Math.max(...currentPoints.map(p => p.x));
      const minY = Math.min(...currentPoints.map(p => p.y));
      const maxY = Math.max(...currentPoints.map(p => p.y));
      newAnnotation.points = currentPoints;
      newAnnotation.x = minX;
      newAnnotation.y = minY;
      newAnnotation.width = maxX - minX || 10;
      newAnnotation.height = maxY - minY || 10;
    }

    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentPoints([]);
  };

  const addTextAnnotation = () => {
    if (!textInput.trim() || !textPosition) return;

    const estWidth = textInput.length * fontSize * 0.6;
    const estHeight = fontSize * 1.4;

    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      type: "text",
      page: currentPage,
      x: textPosition.x,
      y: textPosition.y,
      text: textInput,
      color: currentColor,
      fontSize,
      fontFamily,
      width: estWidth,
      height: estHeight,
    };

    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
    setTextInput("");
    setShowTextInput(false);
    setTextPosition(null);
    setSelectedId(newAnnotation.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const newAnnotations = annotations.filter((a) => a.id !== selectedId);
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selectedId) return;
    const original = annotations.find(a => a.id === selectedId);
    if (!original) return;
    
    const newAnn: Annotation = {
      ...original,
      id: `ann-${Date.now()}`,
      x: original.x + 20,
      y: original.y + 20,
    };
    const newAnnotations = [...annotations, newAnn];
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
    setSelectedId(newAnn.id);
  };

  const updateSelectedAnnotation = (updates: Partial<Annotation>) => {
    if (!selectedId) return;
    setAnnotations(prev => prev.map(a => 
      a.id === selectedId ? { ...a, ...updates } : a
    ));
  };

  const pageAnnotations = annotations.filter((a) => a.page === currentPage);
  const selectedAnnotation = annotations.find(a => a.id === selectedId);

  const tools: { id: ToolType; icon: any; label: string }[] = [
    { id: "select", icon: Move, label: "Select" },
    { id: "snip", icon: Scissors, label: "Snip" },
    { id: "text", icon: Type, label: "Text" },
    { id: "rectangle", icon: Square, label: "Rect" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "line", icon: Minus, label: "Line" },
    { id: "highlight", icon: Highlighter, label: "Highlight" },
    { id: "freehand", icon: Pencil, label: "Draw" },
  ];

  if (files.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Upload a PDF to start editing
      </div>
    );
  }

  if (loading && !pageImage) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading PDF...</p>
      </div>
    );
  }

  const renderResizeHandles = (ann: Annotation) => {
    if (ann.id !== selectedId || ann.type === "freehand") return null;
    
    const handles = [
      { pos: "nw", x: ann.x, y: ann.y },
      { pos: "n", x: ann.x + ann.width / 2, y: ann.y },
      { pos: "ne", x: ann.x + ann.width, y: ann.y },
      { pos: "e", x: ann.x + ann.width, y: ann.y + ann.height / 2 },
      { pos: "se", x: ann.x + ann.width, y: ann.y + ann.height },
      { pos: "s", x: ann.x + ann.width / 2, y: ann.y + ann.height },
      { pos: "sw", x: ann.x, y: ann.y + ann.height },
      { pos: "w", x: ann.x, y: ann.y + ann.height / 2 },
    ];

    return handles.map(({ pos, x, y }) => (
      <rect
        key={pos}
        x={x - 4}
        y={y - 4}
        width={8}
        height={8}
        fill="white"
        stroke="#0066ff"
        strokeWidth={1}
        style={{ cursor: `${pos}-resize` }}
      />
    ));
  };

  return (
    <div className="w-full space-y-4">
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={selectedTool === tool.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedTool(tool.id);
                if (tool.id !== "select") setSelectedId(null);
              }}
              data-testid={`tool-${tool.id}`}
            >
              <tool.icon className="h-4 w-4 mr-1" />
              {tool.label}
            </Button>
          ))}

          <div className="flex items-center gap-1 ml-2 pl-2 border-l">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              data-testid="undo-btn"
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              data-testid="redo-btn"
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          {selectedId && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={duplicateSelected}
                data-testid="duplicate-btn"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelected}
                data-testid="delete-annotation"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          )}

          {selectedTool === "snip" && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l">
              <span className="text-xs text-muted-foreground mr-1">Shape:</span>
              {[
                { id: "rectangle" as const, label: "Rect" },
                { id: "square" as const, label: "Square" },
                { id: "circle" as const, label: "Circle" },
                { id: "freehand" as const, label: "Free" },
              ].map((s) => (
                <Button
                  key={s.id}
                  variant={snipShape === s.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSnipShape(s.id)}
                  className="px-2 py-1 h-7 text-xs"
                >
                  {s.label}
                </Button>
              ))}
            </div>
          )}

          {(snipSelection || snipPoints.length > 2) && (
            <Button
              variant="default"
              size="sm"
              onClick={captureSnipSelection}
              data-testid="capture-snip-btn"
            >
              <Scissors className="h-4 w-4 mr-1" />
              Copy Selection
            </Button>
          )}

          {clipboard && (
            <Button
              variant="outline"
              size="sm"
              onClick={pasteClipboard}
              data-testid="paste-btn"
            >
              <Clipboard className="h-4 w-4 mr-1" />
              Paste
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Color:</Label>
            <div className="flex gap-1 items-center">
              {PRESET_COLORS.slice(0, 6).map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 ${currentColor === color ? "border-primary ring-2 ring-primary/50" : "border-gray-300"}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCurrentColor(color)}
                />
              ))}
              <div className="relative">
                <button
                  className="w-6 h-6 rounded border-2 border-gray-300 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, red, yellow, green, blue, purple)` }}
                  onClick={() => {
                    setColorPickerTarget("stroke");
                    setShowColorPicker(!showColorPicker);
                  }}
                >
                  <Palette className="h-3 w-3 text-white drop-shadow" />
                </button>
                {showColorPicker && colorPickerTarget === "stroke" && (
                  <div className="absolute top-8 left-0 z-50 bg-white p-3 rounded-lg shadow-lg border">
                    <div className="grid grid-cols-5 gap-1 mb-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`w-6 h-6 rounded border ${currentColor === color ? "ring-2 ring-primary" : ""}`}
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            setCurrentColor(color);
                            setShowColorPicker(false);
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-8 h-8 cursor-pointer"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          setCurrentColor(customColor);
                          setShowColorPicker(false);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(selectedTool === "rectangle" || selectedTool === "circle") && (
            <div className="flex items-center gap-2">
              <Switch checked={fillEnabled} onCheckedChange={setFillEnabled} />
              <Label>Fill</Label>
              {fillEnabled && (
                <input
                  type="color"
                  value={currentFillColor}
                  onChange={(e) => setCurrentFillColor(e.target.value)}
                  className="w-6 h-6 cursor-pointer rounded"
                />
              )}
            </div>
          )}

          {selectedTool === "text" && (
            <>
              <div className="flex items-center gap-2">
                <Label>Font:</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.value }}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>Size:</Label>
                <Slider
                  value={[fontSize]}
                  onValueChange={([v]) => setFontSize(v)}
                  min={8}
                  max={72}
                  step={1}
                  className="w-24"
                />
                <span className="text-sm w-10">{fontSize}px</span>
              </div>
            </>
          )}
        </div>

        {selectedAnnotation && (
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
            <span className="text-sm font-medium">Selected: {selectedAnnotation.type}</span>
            {selectedAnnotation.type === "text" && (
              <>
                <div className="flex items-center gap-2">
                  <Label>Font:</Label>
                  <Select 
                    value={selectedAnnotation.fontFamily || "Arial"} 
                    onValueChange={(v) => updateSelectedAnnotation({ fontFamily: v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONTS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Size:</Label>
                  <Slider
                    value={[selectedAnnotation.fontSize || 24]}
                    onValueChange={([v]) => updateSelectedAnnotation({ fontSize: v })}
                    min={8}
                    max={72}
                    step={1}
                    className="w-24"
                  />
                  <span className="text-sm">{selectedAnnotation.fontSize}px</span>
                </div>
              </>
            )}
            {(selectedAnnotation.type === "rectangle" || selectedAnnotation.type === "circle") && (
              <div className="flex items-center gap-2">
                <Switch 
                  checked={selectedAnnotation.filled || false} 
                  onCheckedChange={(v) => updateSelectedAnnotation({ filled: v })}
                />
                <Label>Fill</Label>
                {selectedAnnotation.filled && (
                  <input
                    type="color"
                    value={selectedAnnotation.fillColor || "#ff0000"}
                    onChange={(e) => updateSelectedAnnotation({ fillColor: e.target.value })}
                    className="w-6 h-6 cursor-pointer rounded"
                  />
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Label>Color:</Label>
              <input
                type="color"
                value={selectedAnnotation.color}
                onChange={(e) => updateSelectedAnnotation({ color: e.target.value })}
                className="w-6 h-6 cursor-pointer rounded"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">Page {currentPage} of {pageCount}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === pageCount}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div
          ref={canvasRef}
          className="relative bg-gray-100 rounded overflow-hidden mx-auto"
          style={{ 
            maxWidth: "100%", 
            width: "fit-content",
            cursor: selectedTool === "select" ? "default" : "crosshair"
          }}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isDrawing) {
              setIsDrawing(false);
              setDrawStart(null);
              setCurrentPoints([]);
            }
            setIsDragging(false);
            setResizeHandle(null);
          }}
        >
          {pageImage ? (
            <img 
              ref={imageRef}
              src={pageImage} 
              alt={`Page ${currentPage}`} 
              className="max-w-full select-none" 
              draggable={false} 
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-96 h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {pageAnnotations.map((ann) => {
              const isSelected = ann.id === selectedId;

              if (ann.type === "rectangle") {
                return (
                  <g key={ann.id}>
                    <rect
                      x={ann.x}
                      y={ann.y}
                      width={ann.width}
                      height={ann.height}
                      fill={ann.filled ? ann.fillColor : "none"}
                      stroke={ann.color}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray={isSelected ? "5,5" : undefined}
                    />
                    {renderResizeHandles(ann)}
                  </g>
                );
              }

              if (ann.type === "circle") {
                return (
                  <g key={ann.id}>
                    <ellipse
                      cx={ann.x + ann.width / 2}
                      cy={ann.y + ann.height / 2}
                      rx={ann.width / 2}
                      ry={ann.height / 2}
                      fill={ann.filled ? ann.fillColor : "none"}
                      stroke={ann.color}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray={isSelected ? "5,5" : undefined}
                    />
                    {renderResizeHandles(ann)}
                  </g>
                );
              }

              if (ann.type === "line") {
                return (
                  <g key={ann.id}>
                    <line
                      x1={ann.x}
                      y1={ann.y}
                      x2={ann.endX}
                      y2={ann.endY}
                      stroke={ann.color}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray={isSelected ? "5,5" : undefined}
                    />
                  </g>
                );
              }

              if (ann.type === "highlight") {
                return (
                  <g key={ann.id}>
                    <rect
                      x={ann.x}
                      y={ann.y}
                      width={ann.width}
                      height={ann.height}
                      fill={ann.color}
                      opacity={0.3}
                      stroke={isSelected ? ann.color : "none"}
                      strokeWidth={isSelected ? 2 : 0}
                      strokeDasharray={isSelected ? "5,5" : undefined}
                    />
                    {renderResizeHandles(ann)}
                  </g>
                );
              }

              if (ann.type === "freehand" && ann.points) {
                const d = ann.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                return (
                  <g key={ann.id}>
                    <path
                      d={d}
                      fill="none"
                      stroke={ann.color}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {isSelected && (
                      <rect
                        x={ann.x - 2}
                        y={ann.y - 2}
                        width={ann.width + 4}
                        height={ann.height + 4}
                        fill="none"
                        stroke="#0066ff"
                        strokeWidth={1}
                        strokeDasharray="5,5"
                      />
                    )}
                  </g>
                );
              }

              if (ann.type === "text") {
                return (
                  <g key={ann.id}>
                    {isSelected && (
                      <rect
                        x={ann.x - 2}
                        y={ann.y - 2}
                        width={ann.width + 4}
                        height={ann.height + 4}
                        fill="none"
                        stroke="#0066ff"
                        strokeWidth={1}
                        strokeDasharray="5,5"
                      />
                    )}
                    <text
                      x={ann.x}
                      y={ann.y + (ann.fontSize || 24)}
                      fill={ann.color}
                      fontSize={ann.fontSize}
                      fontFamily={ann.fontFamily || "Arial"}
                    >
                      {ann.text}
                    </text>
                    {renderResizeHandles(ann)}
                  </g>
                );
              }

              if (ann.type === "image" && ann.imageData) {
                return (
                  <g key={ann.id}>
                    <image
                      href={ann.imageData}
                      x={ann.x}
                      y={ann.y}
                      width={ann.width}
                      height={ann.height}
                      preserveAspectRatio="none"
                    />
                    {isSelected && (
                      <rect
                        x={ann.x - 2}
                        y={ann.y - 2}
                        width={ann.width + 4}
                        height={ann.height + 4}
                        fill="none"
                        stroke="#0066ff"
                        strokeWidth={2}
                        strokeDasharray="5,5"
                      />
                    )}
                    {renderResizeHandles(ann)}
                  </g>
                );
              }

              return null;
            })}

            {snipSelection && snipSelection.shape !== "circle" && (
              <rect
                x={snipSelection.x}
                y={snipSelection.y}
                width={snipSelection.width}
                height={snipSelection.height}
                fill="rgba(0, 102, 255, 0.1)"
                stroke="#0066ff"
                strokeWidth={2}
                strokeDasharray="8,4"
              />
            )}

            {snipSelection && snipSelection.shape === "circle" && (
              <ellipse
                cx={snipSelection.x + snipSelection.width / 2}
                cy={snipSelection.y + snipSelection.height / 2}
                rx={snipSelection.width / 2}
                ry={snipSelection.height / 2}
                fill="rgba(0, 102, 255, 0.1)"
                stroke="#0066ff"
                strokeWidth={2}
                strokeDasharray="8,4"
              />
            )}

            {snipPoints.length > 1 && (
              <path
                d={snipPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + (snipPoints.length > 2 ? " Z" : "")}
                fill="rgba(0, 102, 255, 0.1)"
                stroke="#0066ff"
                strokeWidth={2}
                strokeDasharray="8,4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {isDrawing && currentPoints.length > 0 && selectedTool === "freehand" && (
              <path
                d={currentPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
                fill="none"
                stroke={currentColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
            )}

            {isDrawing && drawStart && selectedTool === "rectangle" && (
              <rect
                x={Math.min(drawStart.x, drawStart.x)}
                y={Math.min(drawStart.y, drawStart.y)}
                width={1}
                height={1}
                fill={fillEnabled ? currentFillColor : "none"}
                stroke={currentColor}
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            )}
          </svg>

          {showTextInput && textPosition && (
            <div
              className="absolute bg-white p-3 rounded-lg shadow-lg border z-50"
              style={{ left: textPosition.x, top: textPosition.y }}
            >
              <div className="space-y-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter text..."
                  className="w-56"
                  autoFocus
                  style={{ fontFamily, fontSize: Math.min(fontSize, 20) }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTextAnnotation();
                    if (e.key === "Escape") {
                      setShowTextInput(false);
                      setTextPosition(null);
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addTextAnnotation}>Add</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setShowTextInput(false);
                    setTextPosition(null);
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Select elements to move, resize, and edit. Use the color picker for custom colors!
      </p>
    </div>
  );
}
