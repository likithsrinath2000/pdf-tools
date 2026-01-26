import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Move, Link2, Unlink, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

interface VisualResizeEditorProps {
  imageFile: File | null;
  onChange: (options: { width?: number; height?: number; maintainAspectRatio: boolean }) => void;
}

export function VisualResizeEditor({ imageFile, onChange }: VisualResizeEditorProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [targetWidth, setTargetWidth] = useState<string>("");
  const [targetHeight, setTargetHeight] = useState<string>("");
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [previewScale, setPreviewScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImgSrc(reader.result?.toString() || "");
      });
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setOriginalDimensions({ width: naturalWidth, height: naturalHeight });
    setTargetWidth(String(naturalWidth));
    setTargetHeight(String(naturalHeight));
  }, []);

  useEffect(() => {
    const w = parseInt(targetWidth) || undefined;
    const h = parseInt(targetHeight) || undefined;
    onChangeRef.current({ width: w, height: h, maintainAspectRatio });
  }, [targetWidth, targetHeight, maintainAspectRatio]);

  const handleWidthChange = (value: string) => {
    setTargetWidth(value);
    if (maintainAspectRatio && originalDimensions.width > 0) {
      const ratio = originalDimensions.height / originalDimensions.width;
      const newHeight = Math.round(parseInt(value) * ratio);
      if (!isNaN(newHeight)) {
        setTargetHeight(String(newHeight));
      }
    }
  };

  const handleHeightChange = (value: string) => {
    setTargetHeight(value);
    if (maintainAspectRatio && originalDimensions.height > 0) {
      const ratio = originalDimensions.width / originalDimensions.height;
      const newWidth = Math.round(parseInt(value) * ratio);
      if (!isNaN(newWidth)) {
        setTargetWidth(String(newWidth));
      }
    }
  };

  const applyPreset = (percent: number) => {
    const newWidth = Math.round(originalDimensions.width * (percent / 100));
    const newHeight = Math.round(originalDimensions.height * (percent / 100));
    setTargetWidth(String(newWidth));
    setTargetHeight(String(newHeight));
  };

  const resetToOriginal = () => {
    setTargetWidth(String(originalDimensions.width));
    setTargetHeight(String(originalDimensions.height));
    setPreviewScale(1);
  };

  const getScalePercent = () => {
    if (!originalDimensions.width) return 100;
    return Math.round((parseInt(targetWidth) / originalDimensions.width) * 100) || 100;
  };

  if (!imageFile) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-slate-50 rounded-2xl border">
        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
            <Move size={20} />
          </div>
          <h3 className="text-lg font-semibold">Visual Resize Editor</h3>
        </div>
        <p className="text-center text-muted-foreground">
          Upload an image to resize it visually
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 justify-center">
        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
          <Move size={20} />
        </div>
        <h3 className="text-lg font-semibold">Visual Resize Editor</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border space-y-4">
            <h4 className="font-medium text-sm">Original Dimensions</h4>
            <p className="text-2xl font-bold text-muted-foreground">
              {originalDimensions.width} × {originalDimensions.height} px
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border space-y-4">
            <h4 className="font-medium text-sm">New Dimensions</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resize-width">Width (px)</Label>
                <Input
                  id="resize-width"
                  type="number"
                  value={targetWidth}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  min={1}
                  max={10000}
                  data-testid="input-resize-width"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resize-height">Height (px)</Label>
                <Input
                  id="resize-height"
                  type="number"
                  value={targetHeight}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  min={1}
                  max={10000}
                  data-testid="input-resize-height"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {maintainAspectRatio ? <Link2 size={16} /> : <Unlink size={16} />}
                <Label htmlFor="keep-ratio" className="text-sm cursor-pointer">
                  Lock aspect ratio
                </Label>
              </div>
              <Switch
                id="keep-ratio"
                checked={maintainAspectRatio}
                onCheckedChange={setMaintainAspectRatio}
                data-testid="switch-maintain-aspect"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
            <h4 className="font-medium text-sm">Quick Presets</h4>
            <div className="flex flex-wrap gap-2">
              {[25, 50, 75, 100, 150, 200].map((percent) => (
                <Button
                  key={percent}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(percent)}
                  className={getScalePercent() === percent ? "bg-primary/10 border-primary" : ""}
                  data-testid={`button-preset-${percent}`}
                >
                  {percent}%
                </Button>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={resetToOriginal}
            className="w-full"
            data-testid="button-reset-size"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Original
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
            <span className="text-sm font-medium">Preview ({getScalePercent()}% of original)</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewScale(Math.max(0.25, previewScale - 0.25))}
                data-testid="button-preview-zoom-out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs w-12 text-center">{Math.round(previewScale * 100)}%</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewScale(Math.min(2, previewScale + 0.25))}
                data-testid="button-preview-zoom-in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHJlY3QgZmlsbD0iI2YxZjVmOSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgZmlsbD0iI2UyZThmMCIgeD0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IGZpbGw9IiNlMmU4ZjAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48cmVjdCBmaWxsPSIjZjFmNWY5IiB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNncmlkKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] rounded-xl border overflow-hidden flex items-center justify-center min-h-[300px] max-h-[400px]">
            {imgSrc && (
              <img
                ref={imgRef}
                src={imgSrc}
                alt="Resize preview"
                onLoad={onImageLoad}
                style={{
                  transform: `scale(${previewScale})`,
                  width: `${(parseInt(targetWidth) / originalDimensions.width) * 100}%`,
                  maxWidth: "100%",
                  maxHeight: "400px",
                  objectFit: "contain",
                  transition: "all 0.2s ease"
                }}
              />
            )}
          </div>

          <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
            <p className="text-sm text-green-800">
              <span className="font-medium">New size:</span> {targetWidth} × {targetHeight} px
              {getScalePercent() < 100 && " (smaller file size!)"}
              {getScalePercent() > 100 && " (warning: may reduce quality)"}
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground italic">
        Resize responsibly! Your pixels will thank you.
      </p>
    </div>
  );
}
