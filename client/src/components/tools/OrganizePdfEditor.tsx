import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Reorder } from "framer-motion";
import { FileText, GripVertical, RotateCw, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as pdfjsLib from "pdfjs-dist";
import { getCachedThumbnail, setCachedThumbnail, getFileHash, generateCacheKey } from "@/lib/thumbnailCache";

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

const THUMBNAIL_SCALE = 0.5;

function OrganizePdfEditorComponent({ files, onOptionsChange }: OrganizePdfEditorProps) {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hoveredPage, setHoveredPage] = useState<PageInfo | null>(null);
  const onOptionsChangeRef = useRef(onOptionsChange);
  const processedFileRef = useRef<string>("");
  onOptionsChangeRef.current = onOptionsChange;

  const renderPageToCanvas = useCallback(async (
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    scale: number = THUMBNAIL_SCALE
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
      
      const file = files[0];
      const fileKey = `${file.name}-${file.size}`;
      
      if (fileKey === processedFileRef.current) return;
      
      setLoading(true);
      setLoadingProgress(0);
      
      try {
        const fileHash = await getFileHash(file);
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageInfos: PageInfo[] = [];
        const totalPages = pdfDoc.numPages;
        
        const batchSize = 4;
        for (let batch = 0; batch < Math.ceil(totalPages / batchSize); batch++) {
          const batchPromises: Promise<PageInfo>[] = [];
          
          for (let i = 0; i < batchSize; i++) {
            const pageNum = batch * batchSize + i + 1;
            if (pageNum > totalPages) break;
            
            batchPromises.push((async () => {
              const cacheKey = generateCacheKey(fileHash, pageNum, THUMBNAIL_SCALE);
              let thumbnail = await getCachedThumbnail(cacheKey);
              
              if (!thumbnail) {
                thumbnail = await renderPageToCanvas(pdfDoc, pageNum);
                await setCachedThumbnail(cacheKey, thumbnail);
              }
              
              return {
                id: `page-${pageNum}`,
                pageNumber: pageNum,
                thumbnail,
                rotation: 0
              };
            })());
          }
          
          const batchResults = await Promise.all(batchPromises);
          pageInfos.push(...batchResults);
          setLoadingProgress(Math.round((pageInfos.length / totalPages) * 100));
        }
        
        setPages(pageInfos);
        processedFileRef.current = fileKey;
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
        <p className="text-muted-foreground">Loading PDF pages... {loadingProgress}%</p>
        <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
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

export const OrganizePdfEditor = memo(OrganizePdfEditorComponent);
