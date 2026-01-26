import { useState, useRef, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";

interface WordEditorProps {
  onContentChange: (content: string) => void;
}

export function WordEditor({ onContentChange }: WordEditorProps) {
  const [content, setContent] = useState("");
  const [editorReady, setEditorReady] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    onContentChange(content);
  }, [content, onContentChange]);

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Create Word Document</h3>
        </div>
        <p className="text-sm text-blue-700">
          Write your content below. Format text, add paragraphs, and when ready click "Create DOCX" to download your Word document!
        </p>
      </div>

      <div className="relative min-h-[400px] bg-white rounded-lg border shadow-sm">
        {!editorReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10 rounded-lg">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-muted-foreground">Loading editor...</span>
          </div>
        )}
        <Editor
          tinymceScriptSrc="/tinymce/tinymce.min.js"
          onInit={(evt, editor) => {
            editorRef.current = editor;
            setEditorReady(true);
          }}
          value={content}
          onEditorChange={(newContent) => setContent(newContent)}
          init={{
            height: 400,
            menubar: true,
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'charmap',
              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'table', 'wordcount'
            ],
            toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table | removeformat',
            content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; }',
            skin: 'oxide',
            content_css: 'default',
            branding: false,
            promotion: false,
          }}
        />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Type your document content above. Use the toolbar to format text, add lists, tables, and more.
      </p>
    </div>
  );
}
