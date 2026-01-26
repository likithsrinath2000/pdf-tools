import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, RotateCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface PageInfo {
  pageNumber: number;
  thumbnail: string | null;
  rotation: number;
}

interface RotatePagesEditorProps {
  files: File[];
  onOptionsChange: (options: { rotations: Record<number, number> }) => void;
}

export function RotatePagesEditor({ files, onOptionsChange }: RotatePagesEditorProps) {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const renderPageToCanvas = useCallback(async (
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    scale: number = 0.25
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
    const rotations: Record<number, number> = {};
    pages.forEach(p => {
      rotations[p.pageNumber] = p.rotation;
    });
    onOptionsChange({ rotations });
  }, [pages, onOptionsChange]);

  const rotatePage = (pageNumber: number, direction: 'cw' | 'ccw') => {
    setPages(prev => prev.map(p => {
      if (p.pageNumber === pageNumber) {
        const delta = direction === 'cw' ? 90 : -90;
        return { ...p, rotation: (p.rotation + delta + 360) % 360 };
      }
      return p;
    }));
  };

  const rotateAll = (direction: 'cw' | 'ccw') => {
    setPages(prev => prev.map(p => {
      const delta = direction === 'cw' ? 90 : -90;
      return { ...p, rotation: (p.rotation + delta + 360) % 360 };
    }));
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
      <div className="bg-slate-50 p-4 rounded-xl border mb-6 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Rotate Pages</h3>
          <p className="text-sm text-muted-foreground">
            Rotate individual pages or all pages at once
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => rotateAll('ccw')}>
            <RotateCcw size={16} className="mr-1" /> Rotate All Left
          </Button>
          <Button variant="outline" size="sm" onClick={() => rotateAll('cw')}>
            <RotateCw size={16} className="mr-1" /> Rotate All Right
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        {pages.map((page) => (
          <div 
            key={page.pageNumber}
            className="bg-white border-2 border-slate-200 rounded-lg p-3 hover:border-primary/50 transition-all w-[130px]"
          >
            <div 
              className="w-full aspect-[3/4] bg-slate-50 rounded border overflow-hidden flex items-center justify-center mb-3 transition-transform duration-300"
              style={{ transform: `rotate(${page.rotation}deg)` }}
            >
              {page.thumbnail ? (
                <img 
                  src={page.thumbnail} 
                  alt={`Page ${page.pageNumber}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <FileText size={28} className="text-slate-300" />
              )}
            </div>

            <div className="text-center text-sm font-medium text-slate-700 mb-2">
              Page {page.pageNumber}
              {page.rotation !== 0 && (
                <span className="text-xs text-primary ml-1">({page.rotation}°)</span>
              )}
            </div>

            <div className="flex justify-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => rotatePage(page.pageNumber, 'ccw')}
                title="Rotate Left"
              >
                <RotateCcw size={16} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => rotatePage(page.pageNumber, 'cw')}
                title="Rotate Right"
              >
                <RotateCw size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        🔄 Click the rotate buttons to adjust each page's orientation
      </p>
    </div>
  );
}
