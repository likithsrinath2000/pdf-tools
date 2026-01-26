import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Move, Link2 } from "lucide-react";

interface ResizeOptionsProps {
  onChange: (options: { width?: number; height?: number; maintainAspectRatio: boolean }) => void;
}

export function ResizeOptions({ onChange }: ResizeOptionsProps) {
  const [width, setWidth] = useState<string>("800");
  const [height, setHeight] = useState<string>("600");
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);

  useEffect(() => {
    onChange({
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      maintainAspectRatio
    });
  }, [width, height, maintainAspectRatio, onChange]);

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6 bg-slate-50 rounded-2xl border">
      <div className="flex items-center gap-3 justify-center mb-4">
        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
          <Move size={20} />
        </div>
        <h3 className="text-lg font-semibold">Resize Settings</h3>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="width">Width (px)</Label>
            <Input
              id="width"
              type="number"
              placeholder="Width"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              min={1}
              max={10000}
              data-testid="input-width"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height (px)</Label>
            <Input
              id="height"
              type="number"
              placeholder="Height"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              min={1}
              max={10000}
              data-testid="input-height"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-muted-foreground" />
            <Label htmlFor="aspect-ratio" className="cursor-pointer">
              Maintain aspect ratio
            </Label>
          </div>
          <Switch
            id="aspect-ratio"
            checked={maintainAspectRatio}
            onCheckedChange={setMaintainAspectRatio}
            data-testid="switch-aspect-ratio"
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {maintainAspectRatio 
            ? "Image proportions will be preserved. No stretchy distortions here!"
            : "Warning: Your image might look like it went through a funhouse mirror."}
        </p>
      </div>
    </div>
  );
}
