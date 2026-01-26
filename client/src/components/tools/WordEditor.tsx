import { useState, useRef, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { FileText, Loader2 } from "lucide-react";

import "tinymce/tinymce";
import "tinymce/models/dom";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/lists";
import "tinymce/plugins/link";
import "tinymce/plugins/charmap";
import "tinymce/plugins/anchor";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/code";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/table";
import "tinymce/plugins/wordcount";
import "tinymce/skins/ui/oxide/skin.css";

interface WordEditorProps {
  onContentChange: (content: string) => void;
}

export function WordEditor({ onContentChange }: WordEditorProps) {
  const [content, setContent] = useState("");
  const [editorReady, setEditorReady] = useState(false);
  const editorRef = useRef<any>(null);
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  useEffect(() => {
    onContentChangeRef.current(content);
  }, [content]);

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
          onInit={(evt, editor) => {
            editorRef.current = editor;
            setEditorReady(true);
          }}
          value={content}
          onEditorChange={(newContent) => setContent(newContent)}
          licenseKey="gpl"
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
            skin: false,
            content_css: false,
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
