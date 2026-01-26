import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Stamp } from "lucide-react";

interface WatermarkOptionsProps {
  onChange: (options: { watermarkText: string; opacity: number }) => void;
}

export function WatermarkOptions({ onChange }: WatermarkOptionsProps) {
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(30);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current({ watermarkText, opacity: opacity / 100 });
  }, [watermarkText, opacity]);

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6 bg-slate-50 rounded-2xl border">
      <div className="flex items-center gap-3 justify-center mb-4">
        <div className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center">
          <Stamp size={20} />
        </div>
        <h3 className="text-lg font-semibold">Watermark Settings</h3>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="watermark-text">Watermark Text</Label>
          <Input
            id="watermark-text"
            placeholder="Enter watermark text"
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            data-testid="input-watermark-text"
          />
          <p className="text-xs text-muted-foreground">
            Pro tip: "DO NOT COPY" works great, but "PROPERTY OF [YOUR NAME]" is also a classic.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Opacity</Label>
            <span className="text-sm text-muted-foreground">{opacity}%</span>
          </div>
          <Slider
            value={[opacity]}
            onValueChange={(value) => setOpacity(value[0])}
            min={10}
            max={80}
            step={5}
            className="w-full"
            data-testid="slider-opacity"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtle</span>
            <span>Bold</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border text-center">
          <p className="text-sm text-muted-foreground mb-2">Preview</p>
          <p 
            className="text-2xl font-bold text-gray-400 transform -rotate-12"
            style={{ opacity: opacity / 100 }}
          >
            {watermarkText || "WATERMARK"}
          </p>
        </div>
      </div>
    </div>
  );
}
