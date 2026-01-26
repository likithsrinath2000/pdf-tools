import { useRoute } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TOOLS } from "@/lib/constants";
import { FileUploader } from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import NotFound from "./not-found";

import {
  useToolProcessing,
  ToolHeader,
  ToolProgress,
  FilesSelectedActions,
  DownloadActions,
  ErrorActions,
  CreateToolActions,
  FileList,
} from "@/components/tool-page";

import { MergeEditor } from "@/components/tools/MergeEditor";
import { SplitEditor } from "@/components/tools/SplitEditor";
import { CompressOptions } from "@/components/tools/CompressOptions";
import { PageNumberEditor } from "@/components/tools/PageNumberEditor";
import { PasswordOptions } from "@/components/tools/PasswordOptions";
import { WatermarkOptions } from "@/components/tools/WatermarkOptions";
import { SignatureOptions } from "@/components/tools/SignatureOptions";
import { VisualCropEditor } from "@/components/tools/VisualCropEditor";
import { VisualResizeEditor } from "@/components/tools/VisualResizeEditor";
import { VisualRotateEditor } from "@/components/tools/VisualRotateEditor";
import { VisualCompressEditor } from "@/components/tools/VisualCompressEditor";
import { VisualConvertEditor } from "@/components/tools/VisualConvertEditor";
import { OrganizePdfEditor } from "@/components/tools/OrganizePdfEditor";
import { ExtractPagesEditor } from "@/components/tools/ExtractPagesEditor";
import { RotatePagesEditor } from "@/components/tools/RotatePagesEditor";
import { HtmlToPdfEditor } from "@/components/tools/HtmlToPdfEditor";
import { EditPdfEditor } from "@/components/tools/EditPdfEditor";
import { DocumentEditor } from "@/components/tools/DocumentEditor";
import { WordEditor } from "@/components/tools/WordEditor";
import { ExcelEditor } from "@/components/tools/ExcelEditor";
import { PowerPointEditor } from "@/components/tools/PowerPointEditor";

/**
 * ToolPage - Main page component for processing PDF and image files
 * 
 * This component serves as the orchestrator that coordinates between:
 * - File upload/selection stage
 * - Tool-specific editors for customization
 * - Processing stage with progress indication
 * - Download/error stage for results
 * 
 * The actual state management and processing logic is handled by the
 * useToolProcessing custom hook. UI components are extracted into
 * separate modules for maintainability.
 */
export default function ToolPage() {
  const [match, params] = useRoute("/:id");
  const toolId = params?.id;
  const tool = TOOLS.find(t => t.id === toolId);

  const {
    stage,
    setStage,
    files,
    setFiles,
    progress,
    error,
    processingOptions,
    setProcessingOptions,
    pdfNotEncrypted,
    setPdfNotEncrypted,
    checkingEncryption,
    handleFilesSelected,
    removeFile,
    handleReorder,
    handleProcess,
    handleDownload,
    handleReset,
    handleDeleteFile,
  } = useToolProcessing(toolId);

  if (!tool) {
    return <NotFound />;
  }

  /**
   * Renders the tool-specific content editor based on the current tool ID.
   * Each tool may have its own specialized editor for customization options.
   * This is called during the "files-selected" stage to show editing options.
   */
  const renderContent = () => {
    if (tool.id === "merge-pdf" || tool.id === "remove-pages") {
      return (
        <MergeEditor 
          files={files} 
          onReorder={handleReorder} 
          onRemove={removeFile}
          onPageOrderChange={(pageOrder) => setProcessingOptions({ ...processingOptions, pageOrder })}
        />
      );
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
      return (
        <SplitEditor 
          files={files}
          onOptionsChange={(options) => setProcessingOptions({ ...processingOptions, ...options })}
        />
      );
    }

    if (tool.id === "compress-pdf") {
      return (
        <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FileList files={files} onRemove={removeFile} />
          <CompressOptions onChange={(quality) => setProcessingOptions({ ...processingOptions, quality })} />
        </div>
      );
    }

    if (tool.id === "compress-image") {
      return (
        <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FileList files={files} onRemove={removeFile} />
          <VisualCompressEditor 
            imageFile={files[0] || null}
            onChange={(quality) => setProcessingOptions({ ...processingOptions, quality })} 
          />
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
          <VisualRotateEditor 
            imageFile={files[0] || null}
            onChange={(opts) => setProcessingOptions({ ...processingOptions, ...opts })} 
          />
        </div>
      );
    }

    if (tool.id === "edit-pdf") {
      return (
        <EditPdfEditor 
          files={files} 
          onOptionsChange={(options) => setProcessingOptions({ ...processingOptions, ...options })}
        />
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
          <VisualResizeEditor 
            imageFile={files[0] || null}
            onChange={(opts) => setProcessingOptions({ ...processingOptions, ...opts })} 
          />
        </div>
      );
    }

    if (tool.id === "crop-image") {
      return (
        <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FileList files={files} onRemove={removeFile} />
          <VisualCropEditor 
            imageFile={files[0] || null}
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
          files={files}
          onOptionsChange={(options) => setProcessingOptions({ ...processingOptions, ...options })}
        />
      );
    }

    if (tool.id === "create-document") {
      return (
        <DocumentEditor 
          onOptionsChange={(options) => setProcessingOptions({ ...processingOptions, ...options })}
        />
      );
    }

    if (tool.id === "convert-image") {
      return (
        <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FileList files={files} onRemove={removeFile} />
          <VisualConvertEditor 
            imageFile={files[0] || null}
            onChange={(format) => setProcessingOptions({ ...processingOptions, format })} 
          />
        </div>
      );
    }

    return (
      <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <FileList files={files} onRemove={removeFile} />
      </div>
    );
  };

  /**
   * Renders the appropriate UI based on the current processing stage.
   * Handles upload, files-selected, processing, download, and error stages.
   */
  const renderStageContent = () => {
    const isCreateTool = ["create-document", "create-word", "create-excel", "create-powerpoint"].includes(tool.id);
    
    if (stage === "upload" && !isCreateTool) {
      return (
        <div className="w-full animate-in fade-in zoom-in-95 duration-300">
          <FileUploader 
            onFilesSelected={(selectedFiles) => handleFilesSelected(selectedFiles, tool.id, tool.maxFiles)} 
            accept={tool.accept}
            maxFiles={tool.maxFiles}
          />
          {tool.maxFiles === 1 && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              This tool works with one file at a time
            </p>
          )}
        </div>
      );
    }

    if (stage === "upload" && tool.id === "create-document") {
      return (
        <div className="w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-300">
          <DocumentEditor 
            onOptionsChange={(options) => setProcessingOptions({ ...processingOptions, ...options })}
          />
          <CreateToolActions
            onProcess={() => handleProcess(tool.id)}
            disabled={!processingOptions.content}
            actionText={tool.action}
            color={tool.color}
          />
        </div>
      );
    }

    if (stage === "upload" && tool.id === "create-word") {
      return (
        <div className="w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-300">
          <WordEditor 
            onContentChange={(content) => setProcessingOptions({ ...processingOptions, wordContent: content })}
          />
          <CreateToolActions
            onProcess={() => handleProcess(tool.id)}
            disabled={!processingOptions.wordContent}
            actionText={tool.action}
            color={tool.color}
          />
        </div>
      );
    }

    if (stage === "upload" && tool.id === "create-excel") {
      return (
        <div className="w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-300">
          <ExcelEditor 
            onDataChange={(data) => setProcessingOptions({ ...processingOptions, excelData: data })}
          />
          <CreateToolActions
            onProcess={() => handleProcess(tool.id)}
            disabled={false}
            actionText={tool.action}
            color={tool.color}
          />
        </div>
      );
    }

    if (stage === "upload" && tool.id === "create-powerpoint") {
      return (
        <div className="w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-300">
          <PowerPointEditor 
            onSlidesChange={(slides) => setProcessingOptions({ ...processingOptions, slides })}
          />
          <CreateToolActions
            onProcess={() => handleProcess(tool.id)}
            disabled={!processingOptions.slides || processingOptions.slides.length === 0}
            actionText={tool.action}
            color={tool.color}
          />
        </div>
      );
    }

    if (stage === "files-selected") {
      return (
        <div className="w-full flex flex-col items-center gap-8">
          {renderContent()}
          <FilesSelectedActions
            showAddMore={!tool.maxFiles}
            onAddMore={() => setStage("upload")}
            onProcess={() => handleProcess(tool.id)}
            actionText={tool.action}
            color={tool.color}
          />
        </div>
      );
    }

    if (stage === "processing") {
      return (
        <ToolProgress stage="processing" progress={progress} error={null} color={tool.color} />
      );
    }

    if (stage === "download") {
      return (
        <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <ToolProgress stage="download" progress={100} error={null} color={tool.color} />
          <DownloadActions
            onDownload={() => handleDownload(tool.id)}
            onBackToEdit={() => setStage("files-selected")}
            onStartOver={handleReset}
            onDelete={handleDeleteFile}
          />
        </div>
      );
    }

    if (stage === "error") {
      return (
        <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <ToolProgress stage="error" progress={0} error={error} color={tool.color} />
          <ErrorActions onTryAgain={handleReset} />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20 px-4 md:px-8 flex flex-col items-center">
        <ToolHeader
          icon={tool.icon}
          title={tool.title}
          description={tool.description}
          color={tool.color}
        />

        <div className={cn(
          "w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12 min-h-[400px] flex flex-col items-center justify-center transition-all duration-500",
          stage === "files-selected" ? "max-w-7xl" : "max-w-4xl" 
        )}>
          {renderStageContent()}
        </div>
      </main>

      <Footer />
    </div>
  );
}
