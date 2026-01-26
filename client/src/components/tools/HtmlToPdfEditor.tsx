import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Code, Eye, FileText, Upload } from "lucide-react";

interface HtmlToPdfEditorProps {
  files?: File[];
  onOptionsChange: (options: { htmlContent: string }) => void;
}

const defaultHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    p { color: #666; }
    .highlight { background: #fff3cd; padding: 10px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>Welcome to PDFTools!</h1>
  <p>This is a sample HTML document that will be converted to PDF.</p>
  <p class="highlight">You can write any HTML here including styles, tables, images, and more!</p>
  <p>Edit this content to create your own PDF document.</p>
</body>
</html>`;

export function HtmlToPdfEditor({ files, onOptionsChange }: HtmlToPdfEditorProps) {
  const [htmlContent, setHtmlContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [fileLoaded, setFileLoaded] = useState(false);
  const onOptionsChangeRef = useRef(onOptionsChange);
  const initialLoadRef = useRef(false);
  
  onOptionsChangeRef.current = onOptionsChange;

  const loadFileContent = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      setHtmlContent(text);
      setFileLoaded(true);
    } catch (error) {
      console.error("Error reading HTML file:", error);
      setHtmlContent(defaultHtml);
    }
  }, []);

  useEffect(() => {
    if (files && files.length > 0 && !initialLoadRef.current) {
      loadFileContent(files[0]);
      initialLoadRef.current = true;
    } else if (!files || files.length === 0) {
      if (!initialLoadRef.current) {
        setHtmlContent(defaultHtml);
        initialLoadRef.current = true;
      }
    }
  }, [files, loadFileContent]);

  useEffect(() => {
    if (htmlContent) {
      onOptionsChangeRef.current({ htmlContent });
    }
  }, [htmlContent]);

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="bg-slate-50 p-4 rounded-xl border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="text-primary" size={24} />
          <div>
            <h3 className="font-semibold text-slate-900">HTML to PDF Converter</h3>
            <p className="text-sm text-muted-foreground">
              {fileLoaded ? "Editing uploaded HTML file" : "Write or paste HTML code"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={!showPreview ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowPreview(false)}
          >
            <Code size={16} className="mr-1" /> Code
          </Button>
          <Button 
            variant={showPreview ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowPreview(true)}
          >
            <Eye size={16} className="mr-1" /> Preview
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
        {!showPreview ? (
          <div className="relative">
            <div className="absolute top-3 left-3 text-xs text-slate-400 font-mono">HTML</div>
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm border-0 focus-visible:ring-0 pt-8 resize-none"
              placeholder="Enter your HTML code here..."
              data-testid="html-input"
            />
          </div>
        ) : (
          <div className="min-h-[400px] p-4 bg-white">
            <div className="text-xs text-slate-400 mb-2">Preview</div>
            <iframe
              srcDoc={htmlContent}
              className="w-full h-[360px] border rounded"
              title="HTML Preview"
              sandbox="allow-same-origin"
            />
          </div>
        )}
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setHtmlContent(defaultHtml)}
        >
          Reset to Default
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setHtmlContent('')}
        >
          Clear
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Write HTML with inline styles for best results. External CSS links won't work in the PDF.
      </p>
    </div>
  );
}
