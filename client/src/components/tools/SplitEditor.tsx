import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";
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

interface SplitEditorProps {
  files: File[];
  onOptionsChange?: (options: { pagesToExtract?: number[]; ranges?: string; splitEvery?: number; mode?: string }) => void;
}

export function SplitEditor({ files, onOptionsChange }: SplitEditorProps) {
  const [rangeType, setRangeType] = useState("custom");
  const [activeTab, setActiveTab] = useState("ranges");
  const [customRanges, setCustomRanges] = useState("");
  const [splitEvery, setSplitEvery] = useState("1");
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const processedFileRef = useRef<string>("");

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
      if (files.length === 0 || activeTab !== "extract") return;
      
      const fileKey = `${files[0].name}-${files[0].size}`;
      if (fileKey === processedFileRef.current) return;
      
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
        processedFileRef.current = fileKey;
        pdfDoc.destroy();
      } catch (err) {
        console.error("Error loading PDF:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPages();
  }, [files, activeTab, renderPageToCanvas]);

  useEffect(() => {
    if (!onOptionsChange) return;
    
    if (activeTab === "extract") {
      const pagesToExtract = pages.filter(p => p.selected).map(p => p.pageNumber);
      onOptionsChange({ pagesToExtract, mode: "extract" });
    } else {
      if (rangeType === "custom") {
        onOptionsChange({ ranges: customRanges, mode: "ranges" });
      } else {
        onOptionsChange({ splitEvery: parseInt(splitEvery) || 1, mode: "fixed" });
      }
    }
  }, [activeTab, pages, rangeType, customRanges, splitEvery, onOptionsChange]);

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

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl p-6 border shadow-sm">
      <div className="mb-6 flex items-center justify-center">
         <div className="bg-slate-100 px-4 py-2 rounded-lg text-sm font-medium text-slate-600">
            Selected File: <span className="text-slate-900">{files[0]?.name}</span>
         </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="ranges">Split by Range</TabsTrigger>
          <TabsTrigger value="extract">Extract Pages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ranges" className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Range Mode</h3>
            <RadioGroup value={rangeType} onValueChange={setRangeType} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <RadioGroupItem value="custom" id="custom" className="peer sr-only" />
                <Label
                  htmlFor="custom"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="mb-2 block font-semibold">Custom Ranges</span>
                  <span className="text-xs text-center text-muted-foreground">
                    Define specific ranges (e.g., 1-5, 8, 11-13)
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="fixed" id="fixed" className="peer sr-only" />
                <Label
                  htmlFor="fixed"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="mb-2 block font-semibold">Fixed Ranges</span>
                  <span className="text-xs text-center text-muted-foreground">
                    Split into fixed batches (e.g., every 5 pages)
                  </span>
                </Label>
              </div>
            </RadioGroup>

            {rangeType === "custom" && (
              <div className="pt-4">
                 <Label>Page Ranges</Label>
                 <Input 
                   placeholder="e.g. 1-5, 8, 11-13" 
                   className="mt-2 text-lg h-12" 
                   value={customRanges}
                   onChange={(e) => setCustomRanges(e.target.value)}
                   data-testid="input-custom-ranges"
                 />
                 <p className="text-xs text-muted-foreground mt-2">
                   This will create one PDF file for each range specified.
                 </p>
              </div>
            )}

            {rangeType === "fixed" && (
              <div className="pt-4">
                 <Label>Split every X pages</Label>
                 <Input 
                   type="number" 
                   placeholder="1" 
                   className="mt-2 text-lg h-12" 
                   min={1}
                   value={splitEvery}
                   onChange={(e) => setSplitEvery(e.target.value)}
                   data-testid="input-split-every"
                 />
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="extract">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading PDF pages...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Select Pages to Extract</h3>
                  <p className="text-sm text-muted-foreground">
                    Click on pages to select them. {selectedCount} of {pages.length} selected.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll} data-testid="button-deselect-all">
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 justify-center max-h-[400px] overflow-y-auto p-4 bg-slate-50 rounded-xl border">
                {pages.map((page) => (
                  <div 
                    key={page.pageNumber}
                    onClick={() => togglePage(page.pageNumber)}
                    className={cn(
                      "relative cursor-pointer rounded-lg p-3 transition-all w-[100px]",
                      page.selected 
                        ? "bg-primary/10 border-2 border-primary shadow-md" 
                        : "bg-white border-2 border-slate-200 hover:border-primary/50"
                    )}
                    data-testid={`page-${page.pageNumber}`}
                  >
                    {page.selected && (
                      <div className="absolute top-1 right-1 text-primary bg-white rounded-full">
                        <CheckCircle2 size={18} />
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
                        <FileText size={24} className="text-slate-300" />
                      )}
                    </div>

                    <div className="text-center text-xs font-medium text-slate-700">
                      Page {page.pageNumber}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Click pages to select them for extraction into a new PDF
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
