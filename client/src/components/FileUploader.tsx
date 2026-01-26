import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept: string;
  className?: string;
}

export function FileUploader({ onFilesSelected, accept, className }: FileUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFilesSelected(acceptedFiles);
    }
  }, [onFilesSelected]);

  // Parse accept string to dropzone format
  // simplistic parsing: ".pdf" -> { 'application/pdf': ['.pdf'] }
  const acceptMap = accept.split(',').reduce((acc, ext) => {
    if (ext === '.pdf') acc['application/pdf'] = ['.pdf'];
    if (ext === '.doc') acc['application/msword'] = ['.doc'];
    if (ext === '.docx') acc['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = ['.docx'];
    if (ext === '.xls') acc['application/vnd.ms-excel'] = ['.xls'];
    if (ext === '.xlsx') acc['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] = ['.xlsx'];
    if (ext === '.jpg' || ext === '.jpeg') acc['image/jpeg'] = ['.jpg', '.jpeg'];
    if (ext === '.png') acc['image/png'] = ['.png'];
    return acc;
  }, {} as Record<string, string[]>);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptMap
  });

  return (
    <div 
      {...getRootProps()} 
      className={cn(
        "flex flex-col items-center justify-center w-full h-80 bg-secondary/30 rounded-3xl border-2 border-dashed border-border transition-all duration-300 cursor-pointer overflow-hidden relative group",
        isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "hover:bg-secondary/50 hover:border-primary/50",
        className
      )}
    >
      <input {...getInputProps()} />
      
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="z-10 flex flex-col items-center gap-6 p-6 text-center">
        <div className="w-24 h-24 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform duration-500">
          <UploadCloud size={48} strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-foreground">
            {isDragActive ? "Drop files here" : "Select PDF files"}
          </h3>
          <p className="text-muted-foreground text-lg">
            or drop files here
          </p>
        </div>
        <Button size="lg" className="mt-4 px-8 text-lg h-14 rounded-xl font-semibold shadow-lg shadow-primary/20">
          Select files
        </Button>
      </div>
    </div>
  );
}
