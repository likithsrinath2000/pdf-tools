import { useState, useEffect } from "react";
import { Reorder } from "framer-motion";
import { FileText, GripVertical, Trash2, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface MergeEditorProps {
  files: File[];
  onReorder: (files: File[]) => void;
  onRemove: (index: number) => void;
}

interface MockPage {
  id: string;
  fileIndex: number;
  fileName: string;
  pageNumber: number;
}

export function MergeEditor({ files, onReorder, onRemove }: MergeEditorProps) {
  const [mode, setMode] = useState<"file" | "page">("file");
  const [pages, setPages] = useState<MockPage[]>([]);

  // Generate mock pages when files change
  useEffect(() => {
    const newPages: MockPage[] = [];
    files.forEach((file, fIndex) => {
      // Mocking 3 pages per file for demonstration
      // In a real app, this would come from parsing the PDF
      const pageCount = 3; 
      for (let i = 1; i <= pageCount; i++) {
        newPages.push({
          id: `${file.name}-${fIndex}-${i}`, // Unique ID composed of filename and index to avoid collisions
          fileIndex: fIndex,
          fileName: file.name,
          pageNumber: i
        });
      }
    });
    setPages(newPages);
  }, [files]);

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
          {files.map((file) => (
            <Reorder.Item key={file.name} value={file}>
              <div className="bg-white border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
                <div className="text-slate-400">
                  <GripVertical size={20} />
                </div>
                
                <div className="w-12 h-16 bg-red-50 border border-red-100 rounded flex items-center justify-center text-red-500 shadow-sm relative overflow-hidden">
                  <FileText size={24} />
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-r-[12px] border-t-transparent border-r-red-200" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-slate-700">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent drag start
                    onRemove(files.indexOf(file));
                  }}
                  className="text-slate-400 hover:text-destructive hover:bg-red-50"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div className="bg-slate-100/50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
          <Reorder.Group 
              axis="y" 
              values={pages} 
              onReorder={setPages} 
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4"
              as="ul"
          >
            {pages.map((page) => (
              <Reorder.Item 
                  key={page.id} 
                  value={page}
                  className="relative group cursor-grab active:cursor-grabbing"
              >
                 <div className="bg-white border-2 border-slate-100 rounded-lg p-3 hover:border-primary hover:shadow-lg transition-all aspect-[3/4] flex flex-col items-center gap-2 group-active:scale-105">
                    
                    {/* Mock Page Content */}
                    <div className="flex-1 w-full bg-slate-50 rounded border border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
                       <div className="absolute inset-0 flex flex-col gap-2 p-2 opacity-10">
                           <div className="h-1.5 w-full bg-slate-900 rounded-full" />
                           <div className="h-1.5 w-3/4 bg-slate-900 rounded-full" />
                           <div className="h-1.5 w-full bg-slate-900 rounded-full" />
                           <div className="h-1.5 w-full bg-slate-900 rounded-full" />
                           <div className="h-1.5 w-5/6 bg-slate-900 rounded-full" />
                           <div className="h-1.5 w-full bg-slate-900 rounded-full" />
                       </div>
                       <span className="font-display font-bold text-3xl text-slate-200 select-none">{page.pageNumber}</span>
                    </div>

                    <div className="w-full flex flex-col items-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Page {page.pageNumber}
                      </div>
                      <div className="text-[10px] text-center font-medium truncate w-full text-slate-500 px-1">
                        {page.fileName}
                      </div>
                    </div>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 rounded-lg transition-colors pointer-events-none" />
                    
                    {/* Delete Button */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity scale-90 hover:scale-100">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6 rounded-full shadow-sm"
                        onClick={(e) => {
                           e.stopPropagation(); // Prevent drag start
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
          <p className="text-center text-sm text-muted-foreground mt-6">
            Drag pages to reorder them individually.
          </p>
        </div>
      )}
    </div>
  );
}
