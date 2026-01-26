import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crop } from "lucide-react";

interface CropOptionsProps {
  onChange: (options: { left: number; top: number; width: number; height: number }) => void;
}

export function CropOptions({ onChange }: CropOptionsProps) {
  const [left, setLeft] = useState<string>("0");
  const [top, setTop] = useState<string>("0");
  const [width, setWidth] = useState<string>("500");
  const [height, setHeight] = useState<string>("500");

  useEffect(() => {
    onChange({
      left: parseInt(left) || 0,
      top: parseInt(top) || 0,
      width: parseInt(width) || 100,
      height: parseInt(height) || 100
    });
  }, [left, top, width, height, onChange]);

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6 bg-slate-50 rounded-2xl border">
      <div className="flex items-center gap-3 justify-center mb-4">
        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
          <Crop size={20} />
        </div>
        <h3 className="text-lg font-semibold">Crop Settings</h3>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Define the crop area in pixels from the top-left corner
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="left">Left offset (px)</Label>
            <Input
              id="left"
              type="number"
              placeholder="0"
              value={left}
              onChange={(e) => setLeft(e.target.value)}
              min={0}
              data-testid="input-left"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="top">Top offset (px)</Label>
            <Input
              id="top"
              type="number"
              placeholder="0"
              value={top}
              onChange={(e) => setTop(e.target.value)}
              min={0}
              data-testid="input-top"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="crop-width">Crop width (px)</Label>
            <Input
              id="crop-width"
              type="number"
              placeholder="500"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              min={1}
              data-testid="input-crop-width"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="crop-height">Crop height (px)</Label>
            <Input
              id="crop-height"
              type="number"
              placeholder="500"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              min={1}
              data-testid="input-crop-height"
            />
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border">
          <p className="text-xs text-muted-foreground text-center">
            Starting from ({left || 0}, {top || 0}), capturing {width || 100}x{height || 100} pixels.
            <br />
            <span className="italic">Like cutting out the best part of a photo, but digital!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
