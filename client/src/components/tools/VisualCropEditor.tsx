import { useState, useRef, useEffect, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Crop as CropIcon, Lock, Unlock, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

interface VisualCropEditorProps {
  imageFile: File | null;
  onChange: (options: { left: number; top: number; width: number; height: number }) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function VisualCropEditor({ imageFile, onChange }: VisualCropEditorProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [lockAspect, setLockAspect] = useState(false);
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
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
    const { width, height, naturalWidth, naturalHeight } = e.currentTarget;
    setImgDimensions({ width, height, naturalWidth, naturalHeight });
    
    const defaultCrop = centerAspectCrop(width, height, 1);
    setCrop(defaultCrop);
  }, []);

  useEffect(() => {
    if (completedCrop && imgRef.current && imgDimensions.naturalWidth > 0) {
      const scaleX = imgDimensions.naturalWidth / imgRef.current.width;
      const scaleY = imgDimensions.naturalHeight / imgRef.current.height;

      const actualCrop = {
        left: Math.round(completedCrop.x * scaleX),
        top: Math.round(completedCrop.y * scaleY),
        width: Math.round(completedCrop.width * scaleX),
        height: Math.round(completedCrop.height * scaleY),
      };

      onChangeRef.current(actualCrop);
    }
  }, [completedCrop, imgDimensions]);

  const handleAspectToggle = (checked: boolean) => {
    setLockAspect(checked);
    if (checked && completedCrop) {
      setAspect(completedCrop.width / completedCrop.height);
    } else {
      setAspect(undefined);
    }
  };

  const setPresetAspect = (ratio: number | undefined) => {
    setAspect(ratio);
    if (ratio && imgRef.current) {
      const newCrop = centerAspectCrop(imgRef.current.width, imgRef.current.height, ratio);
      setCrop(newCrop);
    }
  };

  const resetCrop = () => {
    if (imgRef.current) {
      const defaultCrop = centerAspectCrop(imgRef.current.width, imgRef.current.height, 1);
      setCrop(defaultCrop);
      setAspect(undefined);
      setLockAspect(false);
      setScale(1);
    }
  };

  if (!imageFile) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-slate-50 rounded-2xl border">
        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
            <CropIcon size={20} />
          </div>
          <h3 className="text-lg font-semibold">Visual Crop Editor</h3>
        </div>
        <p className="text-center text-muted-foreground">
          Upload an image to start cropping visually
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 justify-center">
        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
          <CropIcon size={20} />
        </div>
        <h3 className="text-lg font-semibold">Visual Crop Editor</h3>
      </div>

      <div className="flex flex-wrap gap-4 justify-center items-center p-4 bg-slate-50 rounded-xl border">
        <div className="flex items-center gap-2">
          <Label htmlFor="lock-aspect" className="text-sm">Lock Aspect</Label>
          <Switch
            id="lock-aspect"
            checked={lockAspect}
            onCheckedChange={handleAspectToggle}
            data-testid="switch-lock-aspect"
          />
          {lockAspect ? <Lock className="h-4 w-4 text-primary" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresetAspect(1)}
            className={aspect === 1 ? "bg-primary/10" : ""}
            data-testid="button-aspect-1-1"
          >
            1:1
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresetAspect(16 / 9)}
            className={aspect === 16 / 9 ? "bg-primary/10" : ""}
            data-testid="button-aspect-16-9"
          >
            16:9
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresetAspect(4 / 3)}
            className={aspect === 4 / 3 ? "bg-primary/10" : ""}
            data-testid="button-aspect-4-3"
          >
            4:3
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresetAspect(undefined)}
            className={!aspect ? "bg-primary/10" : ""}
            data-testid="button-aspect-free"
          >
            Free
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScale(Math.min(2, scale + 0.1))}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={resetCrop}
          data-testid="button-reset-crop"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="flex justify-center p-4 bg-slate-100 rounded-xl border overflow-auto max-h-[500px]">
        {imgSrc && (
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            className="max-w-full"
          >
            <img
              ref={imgRef}
              alt="Crop preview"
              src={imgSrc}
              style={{ transform: `scale(${scale})`, maxHeight: "400px", maxWidth: "100%" }}
              onLoad={onImageLoad}
            />
          </ReactCrop>
        )}
      </div>

      {completedCrop && imgDimensions.naturalWidth > 0 && (
        <div className="p-4 bg-white rounded-xl border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Left</p>
              <p className="font-semibold">
                {Math.round(completedCrop.x * (imgDimensions.naturalWidth / (imgRef.current?.width || 1)))}px
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Top</p>
              <p className="font-semibold">
                {Math.round(completedCrop.y * (imgDimensions.naturalHeight / (imgRef.current?.height || 1)))}px
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Width</p>
              <p className="font-semibold">
                {Math.round(completedCrop.width * (imgDimensions.naturalWidth / (imgRef.current?.width || 1)))}px
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Height</p>
              <p className="font-semibold">
                {Math.round(completedCrop.height * (imgDimensions.naturalHeight / (imgRef.current?.height || 1)))}px
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-3 italic">
            Drag the corners or edges to adjust your crop. It's like giving your image a haircut!
          </p>
        </div>
      )}
    </div>
  );
}
