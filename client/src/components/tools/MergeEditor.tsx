import { useState, useEffect, useRef, useCallback } from "react";
import { Reorder } from "framer-motion";
import { FileText, GripVertical, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import * as pdfjsLib from "pdfjs-dist";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface MergeEditorProps {
  files: File[];
  onReorder: (files: File[]) => void;
  onRemove: (index: number) => void;
}

interface PageInfo {
  id: string;
  fileIndex: number;
  fileName: string;
  pageNumber: number;
  thumbnail: string | null;
}

interface FileInfo {
  file: File;
  index: number;
  pageCount: number;
  thumbnail: string | null;
}

export function MergeEditor({ files, onReorder, onRemove }: MergeEditorProps) {
  const [mode, setMode] = useState<"file" | "page">("file");
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [fileInfos, setFileInfos] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const processedFilesRef = useRef<string>("");

  const renderPageToCanvas = useCallback(async (
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    scale: number = 0.4
  ): Promise<string> => {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get canvas context");
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
    } as any).promise;
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  useEffect(() => {
    const processFiles = async () => {
      if (files.length === 0) {
        setPages([]);
        setFileInfos([]);
        processedFilesRef.current = "";
        return;
      }

      const currentFilesKey = files.map((f, i) => `${f.name}-${f.size}-${i}`).join("|");
      
      if (currentFilesKey === processedFilesRef.current) {
        return;
      }

      setLoading(true);
      
      try {
        const allPages: PageInfo[] = [];
        const infos: FileInfo[] = [];
        
        for (let fIndex = 0; fIndex < files.length; fIndex++) {
          const file = files[fIndex];
          const fileKey = `${file.name}-${file.size}-${fIndex}`;
          
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const pageCount = pdfDoc.numPages;
            
            // Render first page thumbnail for file view
            const fileThumbnail = await renderPageToCanvas(pdfDoc, 1, 0.15);
            infos.push({ file, index: fIndex, pageCount, thumbnail: fileThumbnail });
            
            // Render all page thumbnails for page view
            for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
              const pageThumbnail = await renderPageToCanvas(pdfDoc, pageNum, 0.3);
              allPages.push({
                id: `${fileKey}-page-${pageNum}`,
                fileIndex: fIndex,
                fileName: file.name,
                pageNumber: pageNum,
                thumbnail: pageThumbnail,
              });
            }
            
            pdfDoc.destroy();
          } catch (err) {
            console.error(`Error reading PDF ${file.name}:`, err);
            infos.push({ file, index: fIndex, pageCount: 1, thumbnail: null });
            allPages.push({
              id: `${fileKey}-page-1`,
              fileIndex: fIndex,
              fileName: file.name,
              pageNumber: 1,
              thumbnail: null,
            });
          }
        }
        
        setPages(allPages);
        setFileInfos(infos);
        processedFilesRef.current = currentFilesKey;
      } catch (error) {
        console.error("Error processing PDFs:", error);
      } finally {
        setLoading(false);
      }
    };

    processFiles();
  }, [files, renderPageToCanvas]);

  const getFileInfo = (fileIndex: number) => {
    return fileInfos.find(f => f.index === fileIndex);
  };

  if (loading && pages.length === 0) {
    return (
      <div className="w-full max-w-4xl flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Reading PDF pages...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="flex items-center justify-between mb-8 bg-slate-50 p-4 rounded-xl border">
        <div className="space-y-1">
           <h3 className="font-semibold text-slate-900">
             {mode === "file" ? "File Mode" : "Page Mode"}
           </h3>
           <p className="text-sm text-muted-foreground">
             {mode === "file" ? "Reorder entire PDF files" : "Reorder individual pages across files"}
           </p>
        </div>
        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg border shadow-sm">
          <Label htmlFor="mode-toggle" className={`cursor-pointer ${mode === "file" ? "font-bold text-primary" : "text-muted-foreground"}`}>Files</Label>
          <Switch 
            id="mode-toggle" 
            checked={mode === "page"}
            onCheckedChange={(checked) => setMode(checked ? "page" : "file")}
          />
          <Label htmlFor="mode-toggle" className={`cursor-pointer ${mode === "page" ? "font-bold text-primary" : "text-muted-foreground"}`}>Pages</Label>
        </div>
      </div>

      {mode === "file" ? (
        <Reorder.Group axis="y" values={files} onReorder={onReorder} className="space-y-3">
          {files.map((file, index) => {
            const info = getFileInfo(index);
            return (
              <Reorder.Item key={`${file.name}-${file.size}-${index}`} value={file}>
                <div className="bg-white border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
                  <div className="text-slate-400">
                    <GripVertical size={20} />
                  </div>
                  
                  <div className="w-12 h-16 bg-slate-50 border rounded flex items-center justify-center shadow-sm relative overflow-hidden">
                    {info?.thumbnail ? (
                      <img 
                        src={info.thumbnail} 
                        alt="PDF preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText size={24} className="text-red-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-slate-700">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                      {info && info.pageCount > 0 && (
                        <span className="ml-2 text-primary font-medium">
                          • {info.pageCount} page{info.pageCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                    className="text-slate-400 hover:text-destructive hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      ) : (
        <div className="bg-slate-100/50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Rendering page thumbnails...</span>
            </div>
          ) : (
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
                    className="relative group cursor-grab active:cursor-grabbing w-[120px]"
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                >
                   <div className="bg-white border-2 border-slate-100 rounded-lg p-2 hover:border-primary hover:shadow-lg transition-all flex flex-col items-center gap-2 group-active:scale-105 select-none">
                      
                      <div className="w-full aspect-[3/4] bg-slate-50 rounded border overflow-hidden flex items-center justify-center">
                        {page.thumbnail ? (
                          <img 
                            src={page.thumbnail} 
                            alt={`Page ${page.pageNumber}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-300">
                            <FileText size={32} />
                            <span className="text-xs mt-1">Page {page.pageNumber}</span>
                          </div>
                        )}
                      </div>

                      <div className="w-full flex flex-col items-center px-1">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Page {page.pageNumber}
                        </div>
                        <div className="text-[9px] text-center font-medium truncate w-full text-slate-400">
                          {page.fileName}
                        </div>
                      </div>
                      
                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 rounded-lg transition-colors pointer-events-none" />
                      
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6 rounded-full shadow-sm"
                          onClick={(e) => {
                             e.stopPropagation();
                             setPages(pages.filter(p => p.id !== page.id));
                          }}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                   </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Drag pages to reorder them individually.
          </p>
        </div>
      )}
    </div>
  );
}
