import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { CheckCircle2, Gauge, ImageIcon, FileDown, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VisualCompressEditorProps {
  imageFile: File | null;
  onChange: (quality: string) => void;
}

export function VisualCompressEditor({ imageFile, onChange }: VisualCompressEditorProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [quality, setQuality] = useState("medium");
  const [customQuality, setCustomQuality] = useState(50);
  const [useCustom, setUseCustom] = useState(false);
  const [originalSize, setOriginalSize] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");
  const [estimatedSize, setEstimatedSize] = useState(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (imageFile) {
      setOriginalSize(imageFile.size);
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImgSrc(reader.result?.toString() || "");
      });
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  useEffect(() => {
    if (useCustom) {
      onChangeRef.current(`custom-${customQuality}`);
    } else {
      onChangeRef.current(quality);
    }
  }, [quality, customQuality, useCustom]);

  useEffect(() => {
    if (!imgSrc) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0);
      
      const qualityValue = useCustom ? customQuality / 100 : getQualityValue();
      const dataUrl = canvas.toDataURL("image/jpeg", qualityValue);
      setPreviewDataUrl(dataUrl);
      
      const base64Length = dataUrl.length - "data:image/jpeg;base64,".length;
      const estimatedBytes = Math.round(base64Length * 0.75);
      setEstimatedSize(estimatedBytes);
    };
    img.src = imgSrc;
  }, [imgSrc, quality, customQuality, useCustom]);

  const getQualityValue = () => {
    switch (quality) {
      case "low": return 0.3;
      case "medium": return 0.6;
      case "high": return 0.85;
      default: return 0.6;
    }
  };

  const handlePresetChange = (value: string) => {
    setQuality(value);
    setUseCustom(false);
  };

  const handleSliderChange = (value: number[]) => {
    setCustomQuality(value[0]);
    setUseCustom(true);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getSavingsPercent = () => {
    if (!originalSize || !estimatedSize) return 0;
    return Math.max(0, Math.round((1 - estimatedSize / originalSize) * 100));
  };

  const getQualityLabel = (value: number) => {
    if (value <= 20) return "Maximum compression";
    if (value <= 40) return "High compression";
    if (value <= 60) return "Balanced";
    if (value <= 80) return "High quality";
    return "Maximum quality";
  };

  if (!imageFile) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-3 justify-center">
          <div className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center">
            <FileDown size={20} />
          </div>
          <h3 className="text-lg font-semibold">Visual Compress Editor</h3>
        </div>
        <p className="text-center text-muted-foreground">
          Upload an image to see compression preview
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 justify-center">
        <div className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center">
          <FileDown size={20} />
        </div>
        <h3 className="text-lg font-semibold">Visual Compress Editor</h3>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <RadioGroup 
        value={useCustom ? "" : quality} 
        onValueChange={handlePresetChange} 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="h-full">
          <RadioGroupItem value="low" id="extreme" className="peer sr-only" />
          <Label
            htmlFor="extreme"
            className={cn(
              "relative flex flex-col gap-3 rounded-xl border-2 bg-white p-5 cursor-pointer hover:border-primary/50 transition-all h-full",
              quality === "low" && !useCustom 
                ? "border-primary bg-green-50/50" 
                : "border-muted"
            )}
          >
            {quality === "low" && !useCustom && (
              <div className="absolute top-3 right-3 text-green-600">
                <CheckCircle2 size={18} />
              </div>
            )}
            <div className="font-bold text-slate-800">Extreme</div>
            <p className="text-sm text-muted-foreground flex-1">
              Less quality, maximum compression
            </p>
            <div className="text-sm font-bold text-green-700">-70% Size</div>
          </Label>
        </div>

        <div className="h-full">
          <RadioGroupItem value="medium" id="recommended" className="peer sr-only" />
          <Label
            htmlFor="recommended"
            className={cn(
              "relative flex flex-col gap-3 rounded-xl border-2 bg-white p-5 cursor-pointer hover:border-primary/50 transition-all h-full",
              quality === "medium" && !useCustom 
                ? "border-primary bg-green-50/50" 
                : "border-muted"
            )}
          >
            {quality === "medium" && !useCustom && (
              <div className="absolute top-3 right-3 text-green-600">
                <CheckCircle2 size={18} />
              </div>
            )}
            <div className="font-bold text-slate-800">Recommended</div>
            <p className="text-sm text-muted-foreground flex-1">
              Good quality, good compression
            </p>
            <div className="text-sm font-bold text-green-700">-40% Size</div>
          </Label>
        </div>

        <div className="h-full">
          <RadioGroupItem value="high" id="less" className="peer sr-only" />
          <Label
            htmlFor="less"
            className={cn(
              "relative flex flex-col gap-3 rounded-xl border-2 bg-white p-5 cursor-pointer hover:border-primary/50 transition-all h-full",
              quality === "high" && !useCustom 
                ? "border-primary bg-green-50/50" 
                : "border-muted"
            )}
          >
            {quality === "high" && !useCustom && (
              <div className="absolute top-3 right-3 text-green-600">
                <CheckCircle2 size={18} />
              </div>
            )}
            <div className="font-bold text-slate-800">Less Compression</div>
            <p className="text-sm text-muted-foreground flex-1">
              High quality, less compression
            </p>
            <div className="text-sm font-bold text-green-700">-10% Size</div>
          </Label>
        </div>
      </RadioGroup>

      <div className={cn(
        "bg-white rounded-xl border-2 p-5 space-y-4 transition-all",
        useCustom ? "border-primary bg-blue-50/30" : "border-muted"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-muted-foreground" />
            <Label className="font-semibold text-slate-800">Fine-tune Quality</Label>
          </div>
          <span className="text-sm font-medium text-primary">
            {useCustom ? `${customQuality}% - ${getQualityLabel(customQuality)}` : "Use slider"}
          </span>
        </div>
        
        <Slider
          value={[customQuality]}
          onValueChange={handleSliderChange}
          min={10}
          max={100}
          step={5}
          className="cursor-pointer"
          data-testid="compression-slider"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Smaller file</span>
          <span>Higher quality</span>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Original</p>
            <p className="text-lg font-bold">{formatSize(originalSize)}</p>
          </div>
          <div className="text-2xl text-muted-foreground">→</div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Estimated</p>
            <p className="text-lg font-bold text-green-600">{formatSize(estimatedSize)}</p>
          </div>
        </div>
        <div className="text-center px-4 py-2 bg-green-100 rounded-lg">
          <p className="text-2xl font-bold text-green-700">-{getSavingsPercent()}%</p>
          <p className="text-xs text-green-600">savings</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          data-testid="button-toggle-preview"
        >
          <Eye className="h-4 w-4 mr-2" />
          {showPreview ? "Hide" : "Show"} Preview
        </Button>
      </div>

      {showPreview && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">Original</p>
            <div className="bg-slate-100 rounded-xl border overflow-hidden flex items-center justify-center p-4 min-h-[200px]">
              {imgSrc && (
                <img
                  src={imgSrc}
                  alt="Original"
                  className="max-w-full max-h-[250px] object-contain"
                />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">Compressed Preview</p>
            <div className="bg-slate-100 rounded-xl border overflow-hidden flex items-center justify-center p-4 min-h-[200px]">
              {previewDataUrl && (
                <img
                  src={previewDataUrl}
                  alt="Compressed preview"
                  className="max-w-full max-h-[250px] object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground italic">
        Watch your file size shrink like magic - but your image stays fabulous!
      </p>
    </div>
  );
}
