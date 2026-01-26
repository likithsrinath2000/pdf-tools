import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  Undo,
  Redo,
  Loader2
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

type ToolType = "select" | "text" | "rectangle" | "circle" | "line" | "highlight" | "freehand";

interface Annotation {
  id: string;
  type: ToolType;
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  fontSize?: number;
  points?: { x: number; y: number }[];
  endX?: number;
  endY?: number;
}

export function EditPdfEditor({ files, onOptionsChange }: EditPdfEditorProps) {
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImage, setPageImage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolType>("select");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentColor, setCurrentColor] = useState("#ff0000");
  const [fontSize, setFontSize] = useState(16);
  const [textInput, setTextInput] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
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

  const handleCanvasClick = (e: React.MouseEvent) => {
    const pos = getRelativePosition(e);

    if (selectedTool === "text") {
      setTextPosition(pos);
      setShowTextInput(true);
      return;
    }

    if (selectedTool === "select") {
      const clicked = annotations.find(
        (a) =>
          a.page === currentPage &&
          pos.x >= a.x &&
          pos.x <= a.x + (a.width || 100) &&
          pos.y >= a.y &&
          pos.y <= a.y + (a.height || 30)
      );
      setSelectedAnnotation(clicked?.id || null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedTool === "select" || selectedTool === "text") return;
    
    const pos = getRelativePosition(e);
    setIsDrawing(true);
    setDrawStart(pos);
    
    if (selectedTool === "freehand") {
      setCurrentPoints([pos]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return;
    
    const pos = getRelativePosition(e);
    
    if (selectedTool === "freehand") {
      setCurrentPoints(prev => [...prev, pos]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return;
    
    const pos = getRelativePosition(e);
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      type: selectedTool,
      page: currentPage,
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      width: Math.abs(pos.x - drawStart.x),
      height: Math.abs(pos.y - drawStart.y),
      color: currentColor,
      fontSize,
    };

    if (selectedTool === "line") {
      newAnnotation.x = drawStart.x;
      newAnnotation.y = drawStart.y;
      newAnnotation.endX = pos.x;
      newAnnotation.endY = pos.y;
    }

    if (selectedTool === "freehand") {
      newAnnotation.points = currentPoints;
      newAnnotation.x = 0;
      newAnnotation.y = 0;
    }

    setAnnotations(prev => [...prev, newAnnotation]);
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentPoints([]);
  };

  const addTextAnnotation = () => {
    if (!textInput.trim() || !textPosition) return;

    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      type: "text",
      page: currentPage,
      x: textPosition.x,
      y: textPosition.y,
      text: textInput,
      color: currentColor,
      fontSize,
      width: textInput.length * fontSize * 0.6,
      height: fontSize * 1.2,
    };

    setAnnotations(prev => [...prev, newAnnotation]);
    setTextInput("");
    setShowTextInput(false);
    setTextPosition(null);
  };

  const deleteSelected = () => {
    if (!selectedAnnotation) return;
    setAnnotations(prev => prev.filter((a) => a.id !== selectedAnnotation));
    setSelectedAnnotation(null);
  };

  const pageAnnotations = annotations.filter((a) => a.page === currentPage);

  const tools: { id: ToolType; icon: any; label: string }[] = [
    { id: "select", icon: Move, label: "Select" },
    { id: "text", icon: Type, label: "Text" },
    { id: "rectangle", icon: Square, label: "Rect" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "line", icon: Minus, label: "Line" },
    { id: "highlight", icon: Highlighter, label: "Highlight" },
    { id: "freehand", icon: Pencil, label: "Draw" },
  ];

  const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#000000"];

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

  return (
    <div className="w-full space-y-4">
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={selectedTool === tool.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTool(tool.id)}
              data-testid={`tool-${tool.id}`}
            >
              <tool.icon className="h-4 w-4 mr-1" />
              {tool.label}
            </Button>
          ))}

          {selectedAnnotation && (
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSelected}
              data-testid="delete-annotation"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Color:</Label>
            <div className="flex gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 ${currentColor === color ? "border-primary" : "border-transparent"}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCurrentColor(color)}
                  data-testid={`color-${color}`}
                />
              ))}
            </div>
          </div>

          {(selectedTool === "text" || selectedTool === "highlight") && (
            <div className="flex items-center gap-2">
              <Label>Size:</Label>
              <Slider
                value={[fontSize]}
                onValueChange={([v]) => setFontSize(v)}
                min={8}
                max={72}
                step={1}
                className="w-32"
              />
              <span className="text-sm w-8">{fontSize}px</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            data-testid="prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === pageCount}
            data-testid="next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div
          ref={canvasRef}
          className="relative bg-gray-100 rounded overflow-hidden cursor-crosshair mx-auto"
          style={{ maxWidth: "100%", width: "fit-content" }}
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
          }}
        >
          {pageImage ? (
            <img src={pageImage} alt={`Page ${currentPage}`} className="max-w-full" draggable={false} />
          ) : (
            <div className="w-96 h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {pageAnnotations.map((ann) => {
              const isSelected = ann.id === selectedAnnotation;
              const strokeWidth = isSelected ? 3 : 2;

              if (ann.type === "rectangle") {
                return (
                  <rect
                    key={ann.id}
                    x={ann.x}
                    y={ann.y}
                    width={ann.width}
                    height={ann.height}
                    fill="none"
                    stroke={ann.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isSelected ? "5,5" : undefined}
                  />
                );
              }

              if (ann.type === "circle") {
                const rx = (ann.width || 0) / 2;
                const ry = (ann.height || 0) / 2;
                return (
                  <ellipse
                    key={ann.id}
                    cx={ann.x + rx}
                    cy={ann.y + ry}
                    rx={rx}
                    ry={ry}
                    fill="none"
                    stroke={ann.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isSelected ? "5,5" : undefined}
                  />
                );
              }

              if (ann.type === "line") {
                return (
                  <line
                    key={ann.id}
                    x1={ann.x}
                    y1={ann.y}
                    x2={ann.endX}
                    y2={ann.endY}
                    stroke={ann.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isSelected ? "5,5" : undefined}
                  />
                );
              }

              if (ann.type === "highlight") {
                return (
                  <rect
                    key={ann.id}
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
                );
              }

              if (ann.type === "freehand" && ann.points) {
                const d = ann.points
                  .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                  .join(" ");
                return (
                  <path
                    key={ann.id}
                    d={d}
                    fill="none"
                    stroke={ann.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              }

              if (ann.type === "text") {
                return (
                  <text
                    key={ann.id}
                    x={ann.x}
                    y={ann.y + (ann.fontSize || 16)}
                    fill={ann.color}
                    fontSize={ann.fontSize}
                    fontFamily="Arial, sans-serif"
                  >
                    {ann.text}
                  </text>
                );
              }

              return null;
            })}

            {isDrawing && currentPoints.length > 0 && selectedTool === "freehand" && (
              <path
                d={currentPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
                fill="none"
                stroke={currentColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
            )}
          </svg>

          {showTextInput && textPosition && (
            <div
              className="absolute bg-white p-2 rounded shadow-lg border"
              style={{ left: textPosition.x, top: textPosition.y }}
            >
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter text..."
                className="w-48 mb-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTextAnnotation();
                  if (e.key === "Escape") {
                    setShowTextInput(false);
                    setTextPosition(null);
                  }
                }}
                data-testid="text-input"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addTextAnnotation} data-testid="add-text-btn">
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowTextInput(false);
                    setTextPosition(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Click to add text, drag to draw shapes. Your annotations will be saved to the PDF!
      </p>
    </div>
  );
}
