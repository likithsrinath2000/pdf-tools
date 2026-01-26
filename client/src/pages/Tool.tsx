import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TOOLS } from "@/lib/constants";
import { FileUploader } from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, File as FileIcon, Trash2, ArrowLeft, ArrowRight, RefreshCw, CheckCircle2, ImageIcon, AlertCircle, X, Unlock, ShieldCheck, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import NotFound from "./not-found";
import { apiClient } from "@/lib/api";
import type { ProcessingJob } from "@shared/schema";

// Import custom editors
import { MergeEditor } from "@/components/tools/MergeEditor";
import { SplitEditor } from "@/components/tools/SplitEditor";
import { CompressOptions } from "@/components/tools/CompressOptions";
import { PageNumberEditor } from "@/components/tools/PageNumberEditor";
import { PasswordOptions } from "@/components/tools/PasswordOptions";
import { WatermarkOptions } from "@/components/tools/WatermarkOptions";
import { RotateOptions } from "@/components/tools/RotateOptions";
import { SignatureOptions } from "@/components/tools/SignatureOptions";
import { ResizeOptions } from "@/components/tools/ResizeOptions";
import { CropOptions } from "@/components/tools/CropOptions";
import { ExtractPagesOptions } from "@/components/tools/ExtractPagesOptions";
import { OrganizePdfEditor } from "@/components/tools/OrganizePdfEditor";
import { ExtractPagesEditor } from "@/components/tools/ExtractPagesEditor";
import { RotatePagesEditor } from "@/components/tools/RotatePagesEditor";
import { HtmlToPdfEditor } from "@/components/tools/HtmlToPdfEditor";

type Stage = "upload" | "files-selected" | "processing" | "download" | "error";

export default function ToolPage() {
  const [match, params] = useRoute("/:id");
  const toolId = params?.id;
  const tool = TOOLS.find(t => t.id === toolId);

  const [stage, setStage] = useState<Stage>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingOptions, setProcessingOptions] = useState<any>({});
  const [pdfNotEncrypted, setPdfNotEncrypted] = useState(false);
  const [checkingEncryption, setCheckingEncryption] = useState(false);

  // Reset state when tool changes
  useEffect(() => {
    setStage("upload");
    setFiles([]);
    setProgress(0);
    setCurrentJob(null);
    setError(null);
    setProcessingOptions({});
    setPdfNotEncrypted(false);
    setCheckingEncryption(false);
  }, [toolId]);

  if (!tool) {
    return <NotFound />;
  }

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const filesToUse = tool?.maxFiles ? selectedFiles.slice(0, tool.maxFiles) : selectedFiles;
    setFiles(prev => tool?.maxFiles ? filesToUse : [...prev, ...filesToUse]);
    setStage("files-selected");
    
    if (toolId === "unlock-pdf" && filesToUse.length > 0) {
      setCheckingEncryption(true);
      setPdfNotEncrypted(false);
      try {
        const isEncrypted = await apiClient.checkPDFEncrypted(filesToUse[0]);
        if (!isEncrypted) {
          setPdfNotEncrypted(true);
        }
      } catch (err) {
        console.error("Failed to check encryption:", err);
      } finally {
        setCheckingEncryption(false);
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (newFiles.length === 0) {
      setStage("upload");
    }
  };

  const handleReorder = (reorderedFiles: File[]) => {
     setFiles(reorderedFiles);
  };

  const handleProcess = async () => {
    if (!toolId) return;
    
    setStage("processing");
    setProgress(0);
    setError(null);

    try {
      const { jobId } = await apiClient.createJob(toolId, files, processingOptions);
      
      await apiClient.pollJobStatus(jobId, (job) => {
        setCurrentJob(job);
        setProgress(job.progress || 0);
      });

      const finalJob = await apiClient.getJob(jobId);
      setCurrentJob(finalJob);
      setStage("download");
    } catch (err: any) {
      setError(err.message || "An error occurred during processing");
      setStage("error");
    }
  };

  const handleDownload = async () => {
    if (!currentJob) return;
    
    try {
      const filename = `${tool?.id}_${Date.now()}.${currentJob.outputFile?.split('.').pop()}`;
      await apiClient.downloadJob(currentJob.id, filename);
    } catch (err: any) {
      setError(err.message || "Failed to download file");
    }
  };

  const handleReset = () => {
    setStage("upload");
    setFiles([]);
    setProgress(0);
    setCurrentJob(null);
    setError(null);
    setProcessingOptions({});
  };

  const handleDeleteFile = async () => {
    if (!currentJob) return;
    
    try {
      await apiClient.deleteJob(currentJob.id);
      handleReset();
    } catch (err: any) {
      console.error("Failed to delete file:", err);
      handleReset();
    }
  };

  // Determine if we show the default list or a custom editor
  const renderContent = () => {
    if (tool.id === "merge-pdf" || tool.id === "remove-pages") {
      return <MergeEditor files={files} onReorder={handleReorder} onRemove={removeFile} />;
    }

    if (tool.id === "organize-pdf") {
      return (
        <OrganizePdfEditor 
          files={files} 
          onOptionsChange={(options) => setProcessingOptions({ ...processingOptions, ...options })}
        />
      );
    }
    
    if (tool.id === "split-pdf") {
      return <SplitEditor files={files} />;
    }

    if (tool.id === "compress-pdf" || tool.id === "compress-image") {
       return (
         <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
           <FileList files={files} onRemove={removeFile} />
           <CompressOptions onChange={(quality) => setProcessingOptions({ ...processingOptions, quality })} />
         </div>
       );
    }

    if (tool.id === "add-page-numbers") {
       return (
         <PageNumberEditor 
           files={files} 
           onOptionsChange={(options) => setProcessingOptions({ ...processingOptions, ...options })}
         />
       );
    }

    if (tool.id === "protect-pdf") {
      return (
        <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FileList files={files} onRemove={removeFile} />
          <PasswordOptions 
            mode="protect" 
            onChange={(password) => setProcessingOptions({ ...processingOptions, password })} 
          />
        </div>
      );
    }

    if (tool.id === "unlock-pdf") {
      if (checkingEncryption) {
        return (
          <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            <FileList files={files} onRemove={removeFile} />
            <div className="flex items-center gap-3 p-6 bg-slate-50 rounded-2xl border">
              <RefreshCw className="animate-spin text-primary" size={24} />
              <span className="text-muted-foreground">Checking if PDF is password protected...</span>
            </div>
          </div>
        );
      }

      if (pdfNotEncrypted) {
        return (
          <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            <FileList files={files} onRemove={removeFile} />
            <div className="w-full max-w-md mx-auto p-8 bg-green-50 border-2 border-green-200 rounded-2xl text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-green-800">Already Unprotected!</h3>
              <p className="text-green-700">
                Good news! This PDF doesn't have password protection. 
                It's already free as a bird! No unlocking needed.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setFiles([]);
                  setPdfNotEncrypted(false);
                  setStage("upload");
                }}
                className="mt-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Upload a different PDF
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FileList files={files} onRemove={removeFile} />
          <PasswordOptions 
            mode="unlock" 
            onChange={(password) => setProcessingOptions({ ...processingOptions, password })} 
          />
        </div>
      );
    }

    if (tool.id === "add-watermark") {
      return (
        <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FileList files={files} onRemove={removeFile} />
          <WatermarkOptions 
            onChange={(opts) => setProcessingOptions({ ...processingOptions, ...opts })} 
          />
        </div>
      );
    }

    if (tool.id === "rotate-pdf") {
      return (
        <RotatePagesEditor 
          files={files} 
          onOptionsChange={(options) => setProcessingOptions({ ...processingOptions, ...options })}
        />
      );
    }

    if (tool.id === "rotate-image") {
      return (
        <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FileList files={files} onRemove={removeFile} />
          <RotateOptions 
            onChange={(angle) => setProcessingOptions({ ...processingOptions, angle })} 
          />
        </div>
      );
    }

    if (tool.id === "sign-pdf") {
      return (
        <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FileList files={files} onRemove={removeFile} />
          <SignatureOptions 
            file={files[0]}
            onChange={(opts) => setProcessingOptions({ ...processingOptions, ...opts })} 
          />
        </div>
      );
    }

    if (tool.id === "resize-image") {
      return (
        <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FileList files={files} onRemove={removeFile} />
          <ResizeOptions 
            onChange={(opts) => setProcessingOptions({ ...processingOptions, ...opts })} 
          />
        </div>
      );
    }

    if (tool.id === "crop-image") {
      return (
        <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FileList files={files} onRemove={removeFile} />
          <CropOptions 
            onChange={(opts) => setProcessingOptions({ ...processingOptions, ...opts })} 
          />
        </div>
      );
    }

    if (tool.id === "extract-pages") {
      return (
        <ExtractPagesEditor 
          files={files} 
          onOptionsChange={(options) => setProcessingOptions({ ...processingOptions, ...options })}
        />
      );
    }

    if (tool.id === "html-to-pdf") {
      return (
        <HtmlToPdfEditor 
          onOptionsChange={(options) => setProcessingOptions({ ...processingOptions, ...options })}
        />
      );
    }

    // Default file list for other tools
    return (
       <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
         <FileList files={files} onRemove={removeFile} />
       </div>
    );
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
        <div className={cn(
           "w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12 min-h-[400px] flex flex-col items-center justify-center transition-all duration-500",
           stage === "files-selected" ? "max-w-7xl" : "max-w-4xl" 
        )}>
          
          {stage === "upload" && (
            <div className="w-full animate-in fade-in zoom-in-95 duration-300">
              <FileUploader 
                onFilesSelected={handleFilesSelected} 
                accept={tool.accept}
                maxFiles={tool.maxFiles}
              />
              {tool.maxFiles === 1 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  This tool works with one file at a time
                </p>
              )}
            </div>
          )}

          {stage === "files-selected" && (
            <div className="w-full flex flex-col items-center gap-8">
               {renderContent()}

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 border-t w-full">
                {!tool.maxFiles && (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => setStage("upload")}
                    className="rounded-full h-12 px-8"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Add more files
                  </Button>
                )}
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
                <h3 className="text-2xl font-bold mb-2">Processing...</h3>
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
                <p className="text-muted-foreground mb-8">Your files have been processed successfully.</p>
                
                <div className="space-y-4">
                  <Button 
                    size="lg" 
                    onClick={handleDownload}
                    className="w-full h-14 text-lg rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform bg-slate-900 hover:bg-slate-800"
                    data-testid="button-download"
                  >
                    <Download className="mr-2 h-5 w-5" /> Download File
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setStage("files-selected")}
                    className="w-full h-12 text-base rounded-xl border-2 hover:bg-slate-50"
                    data-testid="button-back-to-edit"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" /> Back to Edit Options
                  </Button>
                  
                  <div className="flex gap-4 justify-center pt-2">
                    <Button variant="ghost" onClick={handleReset} data-testid="button-start-over">
                      <Plus className="mr-1 h-4 w-4" /> New File
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={handleDeleteFile} 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      data-testid="button-delete"
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Delete File
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-24 h-24 mx-auto bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                <AlertCircle size={48} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Oops! Something went wrong</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                
                <div className="space-y-4">
                  <Button 
                    size="lg" 
                    onClick={handleReset}
                    className="w-full h-14 text-lg rounded-xl"
                    data-testid="button-try-again"
                  >
                    Try Again
                  </Button>
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

function FileList({ files, onRemove }: { files: File[], onRemove: (i: number) => void }) {
  return (
    <div className="grid gap-4 w-full max-w-2xl max-h-[400px] overflow-y-auto p-2">
      {files.map((file, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border group hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="w-12 h-12 rounded-lg bg-white border flex items-center justify-center flex-shrink-0 relative overflow-hidden">
               {file.type.includes('image') ? (
                  <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
               ) : (
                  <FileIcon size={24} className="text-red-500" />
               )}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate text-slate-700">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onRemove(i)} className="text-slate-400 hover:text-destructive">
            <Trash2 size={18} />
          </Button>
        </div>
      ))}
    </div>
  );
}
