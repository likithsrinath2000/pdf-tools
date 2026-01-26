import { useRoute } from "wouter";
import { Suspense, lazy } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TOOLS } from "@/lib/constants";
import { FileUploader } from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
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

/**
 * Lazy-loaded Tool Editor Components
 * 
 * These editor components are lazy-loaded to reduce the initial bundle size
 * of the Tool page. Since users only use one tool at a time, loading all
 * editors upfront is wasteful. Each editor is loaded on-demand when needed.
 * 
 * Benefits:
 * - Significantly smaller initial chunk for Tool page
 * - Editors with heavy dependencies (canvas, PDF rendering) load separately
 * - Better perceived performance for tool switching
 */
const MergeEditor = lazy(() => import("@/components/tools/MergeEditor").then(m => ({ default: m.MergeEditor })));
const SplitEditor = lazy(() => import("@/components/tools/SplitEditor").then(m => ({ default: m.SplitEditor })));
const CompressOptions = lazy(() => import("@/components/tools/CompressOptions").then(m => ({ default: m.CompressOptions })));
const PageNumberEditor = lazy(() => import("@/components/tools/PageNumberEditor").then(m => ({ default: m.PageNumberEditor })));
const PasswordOptions = lazy(() => import("@/components/tools/PasswordOptions").then(m => ({ default: m.PasswordOptions })));
const WatermarkOptions = lazy(() => import("@/components/tools/WatermarkOptions").then(m => ({ default: m.WatermarkOptions })));
const SignatureOptions = lazy(() => import("@/components/tools/SignatureOptions").then(m => ({ default: m.SignatureOptions })));
const VisualCropEditor = lazy(() => import("@/components/tools/VisualCropEditor").then(m => ({ default: m.VisualCropEditor })));
const VisualResizeEditor = lazy(() => import("@/components/tools/VisualResizeEditor").then(m => ({ default: m.VisualResizeEditor })));
const VisualRotateEditor = lazy(() => import("@/components/tools/VisualRotateEditor").then(m => ({ default: m.VisualRotateEditor })));
const VisualCompressEditor = lazy(() => import("@/components/tools/VisualCompressEditor").then(m => ({ default: m.VisualCompressEditor })));
const VisualConvertEditor = lazy(() => import("@/components/tools/VisualConvertEditor").then(m => ({ default: m.VisualConvertEditor })));
const OrganizePdfEditor = lazy(() => import("@/components/tools/OrganizePdfEditor").then(m => ({ default: m.OrganizePdfEditor })));
const ExtractPagesEditor = lazy(() => import("@/components/tools/ExtractPagesEditor").then(m => ({ default: m.ExtractPagesEditor })));
const RotatePagesEditor = lazy(() => import("@/components/tools/RotatePagesEditor").then(m => ({ default: m.RotatePagesEditor })));
const HtmlToPdfEditor = lazy(() => import("@/components/tools/HtmlToPdfEditor").then(m => ({ default: m.HtmlToPdfEditor })));
const EditPdfEditor = lazy(() => import("@/components/tools/EditPdfEditor").then(m => ({ default: m.EditPdfEditor })));
const DocumentEditor = lazy(() => import("@/components/tools/DocumentEditor").then(m => ({ default: m.DocumentEditor })));
const WordEditor = lazy(() => import("@/components/tools/WordEditor").then(m => ({ default: m.WordEditor })));
const ExcelEditor = lazy(() => import("@/components/tools/ExcelEditor").then(m => ({ default: m.ExcelEditor })));
const PowerPointEditor = lazy(() => import("@/components/tools/PowerPointEditor").then(m => ({ default: m.PowerPointEditor })));

/**
 * EditorLoader - Loading fallback for lazy-loaded tool editors
 * Displayed while the editor component is being fetched and loaded
 */
function EditorLoader() {
  return (
    <div className="w-full flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in duration-300">
      <Spinner className="h-8 w-8 text-primary" />
      <p className="text-muted-foreground text-sm">Loading editor...</p>
    </div>
  );
}

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
          <Suspense fallback={<EditorLoader />}>
            <DocumentEditor 
              onOptionsChange={(options) => setProcessingOptions({ ...processingOptions, ...options })}
            />
          </Suspense>
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
          <Suspense fallback={<EditorLoader />}>
            <WordEditor 
              onContentChange={(content) => setProcessingOptions({ ...processingOptions, wordContent: content })}
            />
          </Suspense>
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
          <Suspense fallback={<EditorLoader />}>
            <ExcelEditor 
              onDataChange={(data) => setProcessingOptions({ ...processingOptions, excelData: data })}
            />
          </Suspense>
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
          <Suspense fallback={<EditorLoader />}>
            <PowerPointEditor 
              onSlidesChange={(slides) => setProcessingOptions({ ...processingOptions, slides })}
            />
          </Suspense>
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
          <Suspense fallback={<EditorLoader />}>
            {renderContent()}
          </Suspense>
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
