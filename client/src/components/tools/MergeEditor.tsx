import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Reorder } from "framer-motion";
import { FileText, GripVertical, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import * as pdfjsLib from "pdfjs-dist";
import { getCachedThumbnail, setCachedThumbnail, getFileHash, generateCacheKey } from "@/lib/thumbnailCache";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface MergeEditorProps {
  files: File[];
  onReorder: (files: File[]) => void;
  onRemove: (index: number) => void;
  onPageOrderChange?: (pageOrder: { fileIndex: number; pageNumber: number }[]) => void;
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

const THUMBNAIL_SCALE = 0.5;
const FILE_THUMBNAIL_SCALE = 0.15;

function MergeEditorComponent({ files, onReorder, onRemove, onPageOrderChange }: MergeEditorProps) {
  const [mode, setMode] = useState<"file" | "page">("page");
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [fileInfos, setFileInfos] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hoveredPage, setHoveredPage] = useState<PageInfo | null>(null);
  const processedFilesRef = useRef<string>("");
  const onPageOrderChangeRef = useRef(onPageOrderChange);
  onPageOrderChangeRef.current = onPageOrderChange;

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
      setLoadingProgress(0);
      
      try {
        const allPages: PageInfo[] = [];
        const infos: FileInfo[] = [];
        let totalPages = 0;
        let processedPages = 0;
        
        const fileHashes: string[] = [];
        for (const file of files) {
          fileHashes.push(await getFileHash(file));
        }
        
        for (let fIndex = 0; fIndex < files.length; fIndex++) {
          const file = files[fIndex];
          const fileKey = `${file.name}-${file.size}-${fIndex}`;
          const fileHash = fileHashes[fIndex];
          
          try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            const pageCount = pdfDoc.numPages;
            totalPages += pageCount;
            
            const fileCacheKey = generateCacheKey(fileHash, 1, FILE_THUMBNAIL_SCALE);
            let fileThumbnail = await getCachedThumbnail(fileCacheKey);
            if (!fileThumbnail) {
              fileThumbnail = await renderPageToCanvas(pdfDoc, 1, FILE_THUMBNAIL_SCALE);
              await setCachedThumbnail(fileCacheKey, fileThumbnail);
            }
            infos.push({ file, index: fIndex, pageCount, thumbnail: fileThumbnail });
            
            const batchSize = 4;
            for (let batch = 0; batch < Math.ceil(pageCount / batchSize); batch++) {
              const batchPromises: Promise<PageInfo>[] = [];
              
              for (let i = 0; i < batchSize; i++) {
                const pageNum = batch * batchSize + i + 1;
                if (pageNum > pageCount) break;
                
                batchPromises.push((async () => {
                  const cacheKey = generateCacheKey(fileHash, pageNum, THUMBNAIL_SCALE);
                  let pageThumbnail = await getCachedThumbnail(cacheKey);
                  
                  if (!pageThumbnail) {
                    pageThumbnail = await renderPageToCanvas(pdfDoc, pageNum, THUMBNAIL_SCALE);
                    await setCachedThumbnail(cacheKey, pageThumbnail);
                  }
                  
                  return {
                    id: `${fileKey}-page-${pageNum}`,
                    fileIndex: fIndex,
                    fileName: file.name,
                    pageNumber: pageNum,
                    thumbnail: pageThumbnail,
                  };
                })());
              }
              
              const batchResults = await Promise.all(batchPromises);
              allPages.push(...batchResults);
              processedPages += batchResults.length;
              
              if (totalPages > 0) {
                setLoadingProgress(Math.round((processedPages / Math.max(totalPages, files.length * 5)) * 100));
              }
            }
            
            await loadingTask.destroy();
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

  useEffect(() => {
    if (mode === "page" && pages.length > 0 && onPageOrderChangeRef.current) {
      const pageOrder = pages.map(p => ({
        fileIndex: p.fileIndex,
        pageNumber: p.pageNumber
      }));
      onPageOrderChangeRef.current(pageOrder);
    }
  }, [pages, mode]);

  const handleFileReorder = useCallback((newFileInfos: FileInfo[]) => {
    setFileInfos(newFileInfos);
    const reorderedFiles = newFileInfos.map(info => info.file);
    onReorder(reorderedFiles);
  }, [onReorder]);

  const handleRemoveFile = useCallback((indexToRemove: number) => {
    onRemove(indexToRemove);
    processedFilesRef.current = "";
  }, [onRemove]);

  const getFileColor = (fileIndex: number) => {
    const colors = [
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-green-100 text-green-700 border-green-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-orange-100 text-orange-700 border-orange-200",
      "bg-pink-100 text-pink-700 border-pink-200",
      "bg-cyan-100 text-cyan-700 border-cyan-200",
    ];
    return colors[fileIndex % colors.length];
  };

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border">
        <div>
          <h3 className="font-semibold text-slate-900">Merge Mode</h3>
          <p className="text-sm text-muted-foreground">
            {mode === "file" ? "Reorder entire PDFs" : `Reorder individual pages (${pages.length} total)`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="merge-mode" className={mode === "file" ? "font-medium" : "text-muted-foreground"}>
            By File
          </Label>
          <Switch
            id="merge-mode"
            checked={mode === "page"}
            onCheckedChange={(checked) => setMode(checked ? "page" : "file")}
          />
          <Label htmlFor="merge-mode" className={mode === "page" ? "font-medium" : "text-muted-foreground"}>
            By Page
          </Label>
        </div>
      </div>

      {mode === "file" ? (
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Processing PDFs... {loadingProgress}%</span>
              <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
              </div>
            </div>
          ) : (
            <Reorder.Group 
              axis="y" 
              values={fileInfos} 
              onReorder={handleFileReorder} 
              className="space-y-2"
            >
              {fileInfos.map((info) => (
                <Reorder.Item
                  key={`file-${info.index}-${info.file.name}`}
                  value={info}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-3 bg-white border-2 border-slate-200 rounded-lg p-3 hover:border-primary hover:shadow-md transition-all">
                    <GripVertical size={20} className="text-slate-300 shrink-0" />
                    
                    <div className="w-12 h-16 bg-slate-50 rounded border overflow-hidden flex items-center justify-center shrink-0">
                      {info.thumbnail ? (
                        <img 
                          src={info.thumbnail} 
                          alt={info.file.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <FileText size={24} className="text-slate-300" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-700 truncate">{info.file.name}</div>
                      <div className="text-sm text-slate-400">{info.pageCount} page{info.pageCount !== 1 ? 's' : ''}</div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:bg-red-50 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(info.index);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
          <p className="text-center text-sm text-muted-foreground mt-4">
            Drag files to reorder. Pages within each file maintain their order.
          </p>
        </div>
      ) : (
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Rendering page thumbnails... {loadingProgress}%</span>
              <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 min-w-0 max-h-[500px] overflow-y-auto pr-2">
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
                        
                        <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                          {index + 1}
                        </div>
                        
                        <div className="w-10 h-14 bg-slate-50 rounded border overflow-hidden flex items-center justify-center shrink-0">
                          {page.thumbnail ? (
                            <img 
                              src={page.thumbnail} 
                              alt={`Page ${page.pageNumber}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <FileText size={16} className="text-slate-300" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-700">Page {page.pageNumber}</div>
                          <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${getFileColor(page.fileIndex)}`}>
                            {page.fileName.length > 25 ? page.fileName.substring(0, 25) + '...' : page.fileName}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPages(prev => prev.filter(p => p.id !== page.id));
                          }}
                          title="Remove Page"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>

              <div className="hidden md:block w-[300px] shrink-0 sticky top-0">
                <div className="bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 p-4 h-[400px] flex flex-col items-center justify-center">
                  {hoveredPage ? (
                    <>
                      <div className="w-full max-h-[300px] bg-white rounded-lg shadow-lg border overflow-hidden flex items-center justify-center">
                        {hoveredPage.thumbnail ? (
                          <img 
                            src={hoveredPage.thumbnail} 
                            alt={`Page ${hoveredPage.pageNumber}`}
                            className="max-w-full max-h-[300px] object-contain"
                          />
                        ) : (
                          <FileText size={64} className="text-slate-300" />
                        )}
                      </div>
                      <div className="mt-3 text-center">
                        <div className="font-semibold text-slate-700">Page {hoveredPage.pageNumber}</div>
                        <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${getFileColor(hoveredPage.fileIndex)}`}>
                          {hoveredPage.fileName}
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
          )}
          <p className="text-center text-sm text-muted-foreground mt-4">
            Drag rows to reorder pages from different files. Total: {pages.length} pages
          </p>
        </div>
      )}
    </div>
  );
}

export const MergeEditor = memo(MergeEditorComponent);
