import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, Image, FileImage, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface VisualConvertEditorProps {
  imageFile: File | null;
  onChange: (format: string) => void;
}

const FORMATS = [
  { id: "png", name: "PNG", desc: "Lossless, supports transparency", icon: "🖼️", best: "Graphics, logos, screenshots" },
  { id: "jpg", name: "JPG", desc: "Smaller files, no transparency", icon: "📸", best: "Photos, web images" },
  { id: "webp", name: "WebP", desc: "Modern format, best compression", icon: "🌐", best: "Web optimization" },
  { id: "gif", name: "GIF", desc: "Limited colors, animations", icon: "🎬", best: "Simple graphics, memes" },
  { id: "bmp", name: "BMP", desc: "Uncompressed, large files", icon: "📐", best: "Compatibility, editing" },
  { id: "tiff", name: "TIFF", desc: "High quality, printing", icon: "🖨️", best: "Print, archival" },
];

export function VisualConvertEditor({ imageFile, onChange }: VisualConvertEditorProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState("png");
  const [originalFormat, setOriginalFormat] = useState("");
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (imageFile) {
      const ext = imageFile.name.split(".").pop()?.toLowerCase() || "";
      setOriginalFormat(ext);
      
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const dataUrl = reader.result?.toString() || "";
        setImgSrc(dataUrl);
        
        const img = document.createElement("img");
        img.onload = () => {
          setDimensions({ width: img.width, height: img.height });
        };
        img.src = dataUrl;
      });
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  useEffect(() => {
    onChangeRef.current(selectedFormat);
  }, [selectedFormat]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!imageFile) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-slate-50 rounded-2xl border">
        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center">
            <FileImage size={20} />
          </div>
          <h3 className="text-lg font-semibold">Visual Convert Editor</h3>
        </div>
        <p className="text-center text-muted-foreground">
          Upload an image to convert it to another format
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 justify-center">
        <div className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center">
          <FileImage size={20} />
        </div>
        <h3 className="text-lg font-semibold">Visual Convert Editor</h3>
      </div>

      <div className="flex items-center justify-center gap-4 p-4 bg-slate-50 rounded-xl border">
        <div className="bg-white rounded-xl border overflow-hidden w-32 h-32 flex items-center justify-center">
          {imgSrc && (
            <img
              src={imgSrc}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
        <div className="text-center space-y-1">
          <p className="font-medium">{imageFile.name}</p>
          <p className="text-sm text-muted-foreground">
            {dimensions.width} × {dimensions.height} px
          </p>
          <p className="text-sm text-muted-foreground">
            {formatSize(imageFile.size)} · {originalFormat.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-muted-foreground">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-xl flex items-center justify-center text-2xl font-bold">
            {originalFormat.toUpperCase().slice(0, 3)}
          </div>
          <p className="text-xs mt-1">Current</p>
        </div>
        <ArrowRight className="h-8 w-8" />
        <div className="text-center">
          <div className="w-16 h-16 bg-primary text-white rounded-xl flex items-center justify-center text-2xl font-bold">
            {selectedFormat.toUpperCase().slice(0, 3)}
          </div>
          <p className="text-xs mt-1">New Format</p>
        </div>
      </div>

      <RadioGroup 
        value={selectedFormat} 
        onValueChange={setSelectedFormat} 
        className="grid grid-cols-2 md:grid-cols-3 gap-3"
      >
        {FORMATS.map((format) => (
          <div key={format.id}>
            <RadioGroupItem value={format.id} id={format.id} className="peer sr-only" />
            <Label
              htmlFor={format.id}
              className={cn(
                "relative flex flex-col gap-2 rounded-xl border-2 bg-white p-4 cursor-pointer hover:border-primary/50 transition-all",
                selectedFormat === format.id
                  ? "border-primary bg-orange-50/50" 
                  : "border-muted",
                originalFormat === format.id && "opacity-50"
              )}
            >
              {selectedFormat === format.id && (
                <div className="absolute top-3 right-3 text-orange-600">
                  <CheckCircle2 size={18} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xl">{format.icon}</span>
                <span className="font-bold text-slate-800">{format.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{format.desc}</p>
              <p className="text-xs text-primary font-medium">Best for: {format.best}</p>
              {originalFormat === format.id && (
                <span className="text-xs text-orange-600 font-medium">(Current format)</span>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>

      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
        <p className="text-center text-green-800">
          <span className="font-medium">Converting:</span>{" "}
          {originalFormat.toUpperCase()} → {selectedFormat.toUpperCase()}
          {originalFormat === selectedFormat && " (no change needed)"}
        </p>
      </div>

      <p className="text-center text-xs text-muted-foreground italic">
        Because sometimes your image needs a wardrobe change!
      </p>
    </div>
  );
}
