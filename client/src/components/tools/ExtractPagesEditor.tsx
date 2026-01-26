import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface PageInfo {
  pageNumber: number;
  thumbnail: string | null;
  selected: boolean;
}

interface ExtractPagesEditorProps {
  files: File[];
  onOptionsChange: (options: { pagesToExtract: number[] }) => void;
}

export function ExtractPagesEditor({ files, onOptionsChange }: ExtractPagesEditorProps) {
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
            selected: false
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
    const pagesToExtract = pages.filter(p => p.selected).map(p => p.pageNumber);
    onOptionsChange({ pagesToExtract });
  }, [pages, onOptionsChange]);

  const togglePage = (pageNumber: number) => {
    setPages(prev => prev.map(p => 
      p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p
    ));
  };

  const selectAll = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: true })));
  };

  const deselectAll = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: false })));
  };

  const selectedCount = pages.filter(p => p.selected).length;

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
          <h3 className="font-semibold text-slate-900">Select Pages to Extract</h3>
          <p className="text-sm text-muted-foreground">
            Click on pages to select them. {selectedCount} of {pages.length} selected.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Deselect All
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        {pages.map((page) => (
          <div 
            key={page.pageNumber}
            onClick={() => togglePage(page.pageNumber)}
            className={cn(
              "relative cursor-pointer rounded-lg p-3 transition-all w-[120px]",
              page.selected 
                ? "bg-primary/10 border-2 border-primary shadow-md" 
                : "bg-white border-2 border-slate-200 hover:border-primary/50"
            )}
          >
            {page.selected && (
              <div className="absolute top-2 right-2 text-primary">
                <CheckCircle2 size={20} fill="currentColor" className="text-white" />
              </div>
            )}
            
            <div className="w-full aspect-[3/4] bg-slate-50 rounded border overflow-hidden flex items-center justify-center mb-2">
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

            <div className="text-center text-sm font-medium text-slate-700">
              Page {page.pageNumber}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        📄 Click pages to select them for extraction
      </p>
    </div>
  );
}
