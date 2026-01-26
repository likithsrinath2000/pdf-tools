import { useState, useEffect, useCallback } from "react";
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

  const renderPageToCanvas = useCallback(async (
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    scale: number = 0.3
  ): Promise<string> => {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get canvas context");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport } as any).promise;
    return canvas.toDataURL("image/jpeg", 0.8);
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
    onOptionsChange({ pageOrder, rotations });
  }, [pages, onOptionsChange]);

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
    <div className="w-full max-w-5xl">
      <div className="bg-slate-50 p-4 rounded-xl border mb-6">
        <h3 className="font-semibold text-slate-900 mb-2">Organize Your Pages</h3>
        <p className="text-sm text-muted-foreground">
          Drag to reorder, rotate, or remove pages. Your changes will be applied when you process.
        </p>
      </div>

      <Reorder.Group 
        axis="x" 
        values={pages} 
        onReorder={setPages} 
        className="flex flex-wrap gap-4 justify-center"
      >
        {pages.map((page) => (
          <Reorder.Item 
            key={page.id} 
            value={page}
            className="relative group cursor-grab active:cursor-grabbing"
          >
            <div className="bg-white border-2 border-slate-200 rounded-lg p-3 hover:border-primary hover:shadow-lg transition-all w-[140px]">
              <div className="flex justify-center mb-2">
                <GripVertical size={16} className="text-slate-300" />
              </div>
              
              <div 
                className="w-full aspect-[3/4] bg-slate-50 rounded border overflow-hidden flex items-center justify-center mb-3"
                style={{ transform: `rotate(${page.rotation}deg)` }}
              >
                {page.thumbnail ? (
                  <img 
                    src={page.thumbnail} 
                    alt={`Page ${page.pageNumber}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <FileText size={32} className="text-slate-300" />
                )}
              </div>

              <div className="text-center text-sm font-medium text-slate-700 mb-2">
                Page {page.pageNumber}
              </div>

              <div className="flex justify-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); rotatePage(page.id, 'ccw'); }}
                  title="Rotate Left"
                >
                  <RotateCcw size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); rotatePage(page.id, 'cw'); }}
                  title="Rotate Right"
                >
                  <RotateCw size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                  title="Remove Page"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <p className="text-center text-sm text-muted-foreground mt-6">
        🎨 Drag pages to reorder, click buttons to rotate or remove
      </p>
    </div>
  );
}
