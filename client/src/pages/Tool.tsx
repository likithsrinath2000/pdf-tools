import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TOOLS } from "@/lib/constants";
import { FileUploader } from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, File as FileIcon, Trash2, ArrowLeft, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import NotFound from "./not-found";

type Stage = "upload" | "files-selected" | "processing" | "download";

export default function ToolPage() {
  const [match, params] = useRoute("/:id");
  const toolId = params?.id;
  const tool = TOOLS.find(t => t.id === toolId);

  const [stage, setStage] = useState<Stage>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);

  // Reset state when tool changes
  useEffect(() => {
    setStage("upload");
    setFiles([]);
    setProgress(0);
  }, [toolId]);

  if (!tool) {
    return <NotFound />;
  }

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(prev => [...prev, ...selectedFiles]);
    setStage("files-selected");
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (newFiles.length === 0) {
      setStage("upload");
    }
  };

  const handleProcess = () => {
    setStage("processing");
    // Simulate processing
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => setStage("download"), 500);
      }
      setProgress(p);
    }, 500);
  };

  const handleDownload = () => {
    // Fake download logic
    const blob = new Blob(["Fake PDF Content"], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `processed_document.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20 px-4 md:px-8 flex flex-col items-center">
        {/* Tool Header */}
        <div className="text-center max-w-2xl mb-12 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", tool.color)}>
              <tool.icon size={28} />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-display text-slate-900">{tool.title}</h1>
          <p className="text-xl text-muted-foreground">{tool.description}</p>
        </div>

        {/* Main Content Area */}
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12 min-h-[400px] flex flex-col items-center justify-center transition-all duration-500">
          
          {stage === "upload" && (
            <div className="w-full animate-in fade-in zoom-in-95 duration-300">
              <FileUploader 
                onFilesSelected={handleFilesSelected} 
                accept={tool.accept} 
              />
            </div>
          )}

          {stage === "files-selected" && (
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid gap-4 max-h-[400px] overflow-y-auto p-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border group hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                        <FileIcon size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => setStage("upload")}
                  className="rounded-full h-12 px-8"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Add more files
                </Button>
                <Button 
                  size="lg" 
                  onClick={handleProcess}
                  className={cn("rounded-full h-12 px-12 text-lg shadow-lg hover:scale-105 transition-transform", tool.color)}
                >
                  {tool.action} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {stage === "processing" && (
            <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative w-24 h-24 mx-auto">
                 <RefreshCw className={cn("w-full h-full animate-spin text-slate-200", tool.color.replace('bg-', 'text-'))} />
                 <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">
                    {Math.round(progress)}%
                 </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Processing your PDF...</h3>
                <p className="text-muted-foreground">Hold tight, this won't take long.</p>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          )}

          {stage === "download" && (
            <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-24 h-24 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={48} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Task Completed!</h3>
                <p className="text-muted-foreground mb-8">Your documents have been processed successfully.</p>
                
                <div className="space-y-4">
                  <Button 
                    size="lg" 
                    onClick={handleDownload}
                    className="w-full h-14 text-lg rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform bg-slate-900 hover:bg-slate-800"
                  >
                    <Download className="mr-2 h-5 w-5" /> Download File
                  </Button>
                  
                  <div className="flex gap-2 justify-center">
                    <Button variant="ghost" onClick={() => window.location.reload()}>
                       Start Over
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
