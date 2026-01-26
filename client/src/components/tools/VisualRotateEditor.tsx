import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical, RotateCcw as Reset } from "lucide-react";

interface VisualRotateEditorProps {
  imageFile: File | null;
  onChange: (options: { angle: number; flipH?: boolean; flipV?: boolean }) => void;
}

export function VisualRotateEditor({ imageFile, onChange }: VisualRotateEditorProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [angle, setAngle] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
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

  useEffect(() => {
    onChangeRef.current({ angle, flipH, flipV });
  }, [angle, flipH, flipV]);

  const rotate90CW = () => setAngle((prev) => (prev + 90) % 360);
  const rotate90CCW = () => setAngle((prev) => (prev - 90 + 360) % 360);

  const reset = () => {
    setAngle(0);
    setFlipH(false);
    setFlipV(false);
  };

  const getTransformStyle = () => {
    const transforms = [];
    if (angle !== 0) transforms.push(`rotate(${angle}deg)`);
    if (flipH) transforms.push("scaleX(-1)");
    if (flipV) transforms.push("scaleY(-1)");
    return transforms.join(" ");
  };

  if (!imageFile) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-slate-50 rounded-2xl border">
        <div className="flex items-center gap-3 justify-center mb-4">
          <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center">
            <RotateCw size={20} />
          </div>
          <h3 className="text-lg font-semibold">Visual Rotate Editor</h3>
        </div>
        <p className="text-center text-muted-foreground">
          Upload an image to rotate and flip it visually
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 justify-center">
        <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center">
          <RotateCw size={20} />
        </div>
        <h3 className="text-lg font-semibold">Visual Rotate Editor</h3>
      </div>

      <div className="flex flex-wrap gap-3 justify-center p-4 bg-slate-50 rounded-xl border">
        <Button
          variant="outline"
          onClick={rotate90CCW}
          data-testid="button-rotate-ccw"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Rotate Left
        </Button>
        <Button
          variant="outline"
          onClick={rotate90CW}
          data-testid="button-rotate-cw"
        >
          <RotateCw className="h-4 w-4 mr-2" />
          Rotate Right
        </Button>
        <Button
          variant={flipH ? "default" : "outline"}
          onClick={() => setFlipH(!flipH)}
          data-testid="button-flip-h"
        >
          <FlipHorizontal className="h-4 w-4 mr-2" />
          Flip Horizontal
        </Button>
        <Button
          variant={flipV ? "default" : "outline"}
          onClick={() => setFlipV(!flipV)}
          data-testid="button-flip-v"
        >
          <FlipVertical className="h-4 w-4 mr-2" />
          Flip Vertical
        </Button>
        <Button
          variant="ghost"
          onClick={reset}
          data-testid="button-reset-rotate"
        >
          <Reset className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="p-4 bg-white rounded-xl border space-y-4">
        <div className="flex items-center justify-between">
          <Label className="font-medium">Fine Rotation</Label>
          <span className="text-sm font-mono bg-slate-100 px-3 py-1 rounded">{angle}°</span>
        </div>
        <Slider
          value={[angle]}
          onValueChange={([val]) => setAngle(val)}
          min={0}
          max={360}
          step={1}
          className="cursor-pointer"
          data-testid="slider-angle"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0°</span>
          <span>90°</span>
          <span>180°</span>
          <span>270°</span>
          <span>360°</span>
        </div>
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((preset) => (
          <Button
            key={preset}
            variant={angle === preset ? "default" : "outline"}
            size="sm"
            onClick={() => setAngle(preset)}
            data-testid={`button-angle-${preset}`}
          >
            {preset}°
          </Button>
        ))}
      </div>

      <div className="bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHJlY3QgZmlsbD0iI2YxZjVmOSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgZmlsbD0iI2UyZThmMCIgeD0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IGZpbGw9IiNlMmU4ZjAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48cmVjdCBmaWxsPSIjZjFmNWY5IiB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNncmlkKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] rounded-xl border overflow-hidden flex items-center justify-center p-8 min-h-[350px]">
        {imgSrc && (
          <img
            src={imgSrc}
            alt="Rotate preview"
            style={{
              transform: getTransformStyle(),
              maxWidth: "100%",
              maxHeight: "300px",
              objectFit: "contain",
              transition: "transform 0.3s ease"
            }}
          />
        )}
      </div>

      <div className="p-3 bg-slate-50 rounded-lg border text-center">
        <p className="text-sm text-muted-foreground">
          Current: <span className="font-semibold text-foreground">{angle}° rotation</span>
          {flipH && <span className="ml-2 text-purple-600">+ Flipped Horizontally</span>}
          {flipV && <span className="ml-2 text-purple-600">+ Flipped Vertically</span>}
        </p>
      </div>

      <p className="text-center text-xs text-muted-foreground italic">
        Turn your world upside down - or just your images!
      </p>
    </div>
  );
}
