import { useState, useRef, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown, FileText, Maximize, Minimize } from "lucide-react";

interface DocumentEditorProps {
  onOptionsChange: (options: any) => void;
  initialContent?: string;
}

export function DocumentEditor({ onOptionsChange, initialContent = "" }: DocumentEditorProps) {
  const editorRef = useRef<any>(null);
  const [content, setContent] = useState(initialContent);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isReady) {
      onOptionsChange({ content, format: "pdf" });
    }
  }, [content, isReady, onOptionsChange]);

  const handleEditorChange = (newContent: string) => {
    setContent(newContent);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getWordCount = () => {
    if (!editorRef.current) return { words: 0, chars: 0 };
    const text = editorRef.current.getContent({ format: "text" });
    const words = text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
    const chars = text.length;
    return { words, chars };
  };

  const containerClass = isFullscreen
    ? "fixed inset-0 z-50 bg-background p-4 overflow-auto"
    : "space-y-4";

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Document Editor</h3>
          <span className="text-sm text-muted-foreground">
            Create rich documents and export to PDF
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          data-testid="button-fullscreen"
        >
          {isFullscreen ? (
            <>
              <Minimize className="h-4 w-4 mr-2" />
              Exit Fullscreen
            </>
          ) : (
            <>
              <Maximize className="h-4 w-4 mr-2" />
              Fullscreen
            </>
          )}
        </Button>
      </div>

      <div className={`border rounded-lg overflow-hidden ${isFullscreen ? "h-[calc(100vh-120px)]" : "min-h-[600px]"}`}>
        {!isReady && (
          <div className="flex items-center justify-center h-[400px] bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading editor... (Preparing your creative canvas)</span>
          </div>
        )}
        <Editor
          tinymceScriptSrc="https://cdn.tiny.cloud/1/no-api-key/tinymce/7/tinymce.min.js"
          onInit={(_evt, editor) => {
            editorRef.current = editor;
            setIsReady(true);
          }}
          initialValue={initialContent || "<p>Start typing your document here...</p>"}
          init={{
            height: isFullscreen ? "calc(100vh - 180px)" : 600,
            menubar: "file edit view insert format tools table help",
            plugins: [
              "advlist",
              "autolink",
              "lists",
              "link",
              "image",
              "charmap",
              "preview",
              "anchor",
              "searchreplace",
              "visualblocks",
              "code",
              "fullscreen",
              "insertdatetime",
              "media",
              "table",
              "help",
              "wordcount",
              "emoticons",
              "codesample",
              "quickbars",
              "pagebreak",
              "nonbreaking",
              "visualchars",
              "template",
              "save",
              "directionality",
              "importcss"
            ],
            toolbar:
              "undo redo | blocks fontfamily fontsize | " +
              "bold italic underline strikethrough | forecolor backcolor | " +
              "alignleft aligncenter alignright alignjustify | " +
              "bullist numlist outdent indent | " +
              "link image media table | " +
              "removeformat | help",
            toolbar_mode: "sliding",
            font_family_formats:
              "Arial=arial,helvetica,sans-serif; " +
              "Arial Black=arial black,avant garde; " +
              "Book Antiqua=book antiqua,palatino; " +
              "Comic Sans MS=comic sans ms,sans-serif; " +
              "Courier New=courier new,courier; " +
              "Georgia=georgia,palatino; " +
              "Helvetica=helvetica; " +
              "Impact=impact,chicago; " +
              "Symbol=symbol; " +
              "Tahoma=tahoma,arial,helvetica,sans-serif; " +
              "Terminal=terminal,monaco; " +
              "Times New Roman=times new roman,times; " +
              "Trebuchet MS=trebuchet ms,geneva; " +
              "Verdana=verdana,geneva",
            font_size_formats: "8pt 10pt 12pt 14pt 16pt 18pt 24pt 36pt 48pt 72pt",
            block_formats:
              "Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre; Blockquote=blockquote; Div=div; Address=address",
            content_style: `
              body { 
                font-family: Arial, sans-serif; 
                font-size: 12pt; 
                line-height: 1.6;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }
              h1 { font-size: 24pt; font-weight: bold; margin-bottom: 16px; }
              h2 { font-size: 20pt; font-weight: bold; margin-bottom: 14px; }
              h3 { font-size: 16pt; font-weight: bold; margin-bottom: 12px; }
              p { margin-bottom: 12px; }
              table { border-collapse: collapse; width: 100%; margin: 16px 0; }
              td, th { border: 1px solid #ddd; padding: 8px; }
              th { background-color: #f5f5f5; font-weight: bold; }
              blockquote { 
                border-left: 4px solid #3b82f6; 
                padding-left: 16px; 
                margin: 16px 0;
                color: #666;
              }
              code { 
                background-color: #f5f5f5; 
                padding: 2px 6px; 
                border-radius: 4px;
                font-family: monospace;
              }
              pre { 
                background-color: #f5f5f5; 
                padding: 16px; 
                border-radius: 8px;
                overflow-x: auto;
              }
              img { max-width: 100%; height: auto; }
              a { color: #3b82f6; }
              hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
            `,
            quickbars_selection_toolbar: "bold italic underline | quicklink h2 h3 blockquote",
            quickbars_insert_toolbar: "quickimage quicktable hr pagebreak",
            contextmenu: "link image table",
            image_advtab: true,
            image_caption: true,
            link_default_target: "_blank",
            table_default_styles: {
              width: "100%",
              borderCollapse: "collapse"
            },
            table_responsive_width: true,
            table_sizing_mode: "responsive",
            paste_data_images: true,
            automatic_uploads: false,
            file_picker_types: "image",
            file_picker_callback: (callback: any, value: any, meta: any) => {
              if (meta.filetype === "image") {
                const input = document.createElement("input");
                input.setAttribute("type", "file");
                input.setAttribute("accept", "image/*");
                input.onchange = function () {
                  const file = (input as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = function () {
                      callback(reader.result as string, { alt: file.name });
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }
            },
            templates: [
              {
                title: "Basic Letter",
                description: "A simple letter template",
                content: `
                  <p>[Your Name]<br>[Your Address]<br>[City, State ZIP]<br>[Date]</p>
                  <p>&nbsp;</p>
                  <p>[Recipient Name]<br>[Recipient Address]<br>[City, State ZIP]</p>
                  <p>&nbsp;</p>
                  <p>Dear [Recipient],</p>
                  <p>[Letter body goes here]</p>
                  <p>&nbsp;</p>
                  <p>Sincerely,<br>[Your Name]</p>
                `
              },
              {
                title: "Meeting Notes",
                description: "Template for meeting notes",
                content: `
                  <h1>Meeting Notes</h1>
                  <p><strong>Date:</strong> [Date]<br><strong>Attendees:</strong> [Names]<br><strong>Location:</strong> [Location]</p>
                  <h2>Agenda</h2>
                  <ol>
                    <li>Item 1</li>
                    <li>Item 2</li>
                    <li>Item 3</li>
                  </ol>
                  <h2>Discussion Points</h2>
                  <p>[Notes here]</p>
                  <h2>Action Items</h2>
                  <ul>
                    <li>[ ] Task 1 - Owner</li>
                    <li>[ ] Task 2 - Owner</li>
                  </ul>
                  <h2>Next Meeting</h2>
                  <p>[Date and time]</p>
                `
              },
              {
                title: "Project Proposal",
                description: "A project proposal template",
                content: `
                  <h1>Project Proposal</h1>
                  <h2>Executive Summary</h2>
                  <p>[Brief overview of the project]</p>
                  <h2>Objectives</h2>
                  <ul>
                    <li>Objective 1</li>
                    <li>Objective 2</li>
                    <li>Objective 3</li>
                  </ul>
                  <h2>Scope</h2>
                  <p>[Define what is included and excluded]</p>
                  <h2>Timeline</h2>
                  <table>
                    <tr><th>Phase</th><th>Duration</th><th>Deliverables</th></tr>
                    <tr><td>Phase 1</td><td>2 weeks</td><td>Deliverable 1</td></tr>
                    <tr><td>Phase 2</td><td>4 weeks</td><td>Deliverable 2</td></tr>
                  </table>
                  <h2>Budget</h2>
                  <p>[Budget details]</p>
                  <h2>Conclusion</h2>
                  <p>[Summary and call to action]</p>
                `
              }
            ],
            setup: (editor: any) => {
              editor.on("change", () => {
                handleEditorChange(editor.getContent());
              });
            },
            branding: false,
            promotion: false,
            skin: "oxide",
            icons: "default",
            statusbar: true,
            elementpath: true,
            resize: true,
            min_height: 400,
            autosave_interval: "30s",
            autosave_restore_when_empty: true,
            autosave_retention: "20m",
            browser_spellcheck: true,
            highlight_on_focus: true,
            visual: true,
            visual_anchor_class: "mce-anchor",
            visual_table_class: "mce-item-table"
          }}
          onEditorChange={handleEditorChange}
        />
      </div>

      {isReady && (
        <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-4">
            <span>Words: {getWordCount().words}</span>
            <span>Characters: {getWordCount().chars}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            <span>Will be exported as PDF when processed</span>
          </div>
        </div>
      )}
    </div>
  );
}
