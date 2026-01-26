import { useState, useEffect, useCallback, useRef } from "react";
import { Reorder } from "framer-motion";
import { FileText, GripVertical, RotateCw, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface PageInfo {
  id: string;
  pageNumber: number;
  thumbnail: string | null;
  rotation: number;
}

interface OrganizePdfEditorProps {
  files: File[];
  onOptionsChange: (options: { pageOrder: number[]; rotations: Record<number, number> }) => void;
}

export function OrganizePdfEditor({ files, onOptionsChange }: OrganizePdfEditorProps) {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredPage, setHoveredPage] = useState<PageInfo | null>(null);
  const onOptionsChangeRef = useRef(onOptionsChange);
  onOptionsChangeRef.current = onOptionsChange;

  const renderPageToCanvas = useCallback(async (
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    scale: number = 0.5
  ): Promise<string> => {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get canvas context");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport } as any).promise;
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  useEffect(() => {
    const loadPages = async () => {
      if (files.length === 0) return;
      setLoading(true);
      try {
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageInfos: PageInfo[] = [];
        
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const thumbnail = await renderPageToCanvas(pdfDoc, i);
          pageInfos.push({
            id: `page-${i}`,
            pageNumber: i,
            thumbnail,
            rotation: 0
          });
        }
        setPages(pageInfos);
        pdfDoc.destroy();
      } catch (err) {
        console.error("Error loading PDF:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPages();
  }, [files, renderPageToCanvas]);

  useEffect(() => {
    const pageOrder = pages.map(p => p.pageNumber);
    const rotations: Record<number, number> = {};
    pages.forEach(p => {
      if (p.rotation !== 0) {
        rotations[p.pageNumber] = p.rotation;
      }
    });
    onOptionsChangeRef.current({ pageOrder, rotations });
  }, [pages]);

  const rotatePage = (id: string, direction: 'cw' | 'ccw') => {
    setPages(prev => prev.map(p => {
      if (p.id === id) {
        const delta = direction === 'cw' ? 90 : -90;
        return { ...p, rotation: (p.rotation + delta + 360) % 360 };
      }
      return p;
    }));
  };

  const removePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading PDF pages...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl">
      <div className="bg-slate-50 p-4 rounded-xl border mb-6">
        <h3 className="font-semibold text-slate-900 mb-2">Organize Your Pages ({pages.length} pages)</h3>
        <p className="text-sm text-muted-foreground">
          Drag rows to reorder. Hover over a row to see a large preview on the right.
        </p>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 max-h-[500px] overflow-y-auto pr-2">
          <Reorder.Group 
            axis="y" 
            values={pages} 
            onReorder={setPages} 
            className="space-y-2"
          >
            {pages.map((page, index) => (
              <Reorder.Item 
                key={page.id} 
                value={page}
                className="cursor-grab active:cursor-grabbing"
                onMouseEnter={() => setHoveredPage(page)}
                onMouseLeave={() => setHoveredPage(null)}
              >
                <div className={`flex items-center gap-3 bg-white border-2 rounded-lg p-3 transition-all ${
                  hoveredPage?.id === page.id ? "border-primary shadow-md bg-primary/5" : "border-slate-200 hover:border-slate-300"
                }`}>
                  <GripVertical size={20} className="text-slate-300 shrink-0" />
                  
                  <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-lg font-bold text-slate-500 shrink-0">
                    {index + 1}
                  </div>
                  
                  <div 
                    className="w-12 h-16 bg-slate-50 rounded border overflow-hidden flex items-center justify-center shrink-0"
                    style={{ transform: `rotate(${page.rotation}deg)` }}
                  >
                    {page.thumbnail ? (
                      <img 
                        src={page.thumbnail} 
                        alt={`Page ${page.pageNumber}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <FileText size={20} className="text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-700">Page {page.pageNumber}</div>
                    <div className="text-xs text-slate-400">
                      {page.rotation !== 0 ? `Rotated ${page.rotation}°` : "Original orientation"}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); rotatePage(page.id, 'ccw'); }}
                      title="Rotate Left"
                    >
                      <RotateCcw size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); rotatePage(page.id, 'cw'); }}
                      title="Rotate Right"
                    >
                      <RotateCw size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                      title="Remove Page"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        <div className="w-[300px] shrink-0 sticky top-0">
          <div className="bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 p-4 h-[400px] flex flex-col items-center justify-center">
            {hoveredPage ? (
              <>
                <div 
                  className="w-full max-h-[320px] bg-white rounded-lg shadow-lg border overflow-hidden flex items-center justify-center"
                  style={{ transform: `rotate(${hoveredPage.rotation}deg)` }}
                >
                  {hoveredPage.thumbnail ? (
                    <img 
                      src={hoveredPage.thumbnail} 
                      alt={`Page ${hoveredPage.pageNumber}`}
                      className="max-w-full max-h-[320px] object-contain"
                    />
                  ) : (
                    <FileText size={64} className="text-slate-300" />
                  )}
                </div>
                <div className="mt-3 text-center">
                  <div className="font-semibold text-slate-700">Page {hoveredPage.pageNumber}</div>
                  <div className="text-xs text-slate-400">
                    {hoveredPage.rotation !== 0 ? `Rotated ${hoveredPage.rotation}°` : "Original"}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400">
                <FileText size={48} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Hover over a page to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Drag rows to reorder pages. Total: {pages.length} pages
      </p>
    </div>
  );
}
