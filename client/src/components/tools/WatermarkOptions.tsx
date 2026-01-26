import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stamp, RotateCcw, Type, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

interface WatermarkOptionsProps {
  onChange: (options: { 
    watermarkText: string; 
    opacity: number; 
    orientation: number;
    fontFamily: string;
    fontSize: number;
  }) => void;
}

const FONTS = [
  { id: "helvetica-bold", name: "Helvetica Bold", preview: "font-bold" },
  { id: "helvetica", name: "Helvetica", preview: "font-normal" },
  { id: "times-roman", name: "Times Roman", preview: "font-serif" },
  { id: "times-bold", name: "Times Bold", preview: "font-serif font-bold" },
  { id: "courier", name: "Courier", preview: "font-mono" },
  { id: "courier-bold", name: "Courier Bold", preview: "font-mono font-bold" },
];

const ORIENTATIONS = [
  { value: -45, label: "Diagonal ↘", icon: "↘" },
  { value: 45, label: "Diagonal ↗", icon: "↗" },
  { value: 0, label: "Horizontal →", icon: "→" },
  { value: 90, label: "Vertical ↑", icon: "↑" },
];

export function WatermarkOptions({ onChange }: WatermarkOptionsProps) {
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(30);
  const [orientation, setOrientation] = useState(-45);
  const [fontFamily, setFontFamily] = useState("helvetica-bold");
  const [fontSize, setFontSize] = useState(50);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current({ 
      watermarkText, 
      opacity: opacity / 100,
      orientation,
      fontFamily,
      fontSize
    });
  }, [watermarkText, opacity, orientation, fontFamily, fontSize]);

  const selectedFont = FONTS.find(f => f.id === fontFamily);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 p-6 bg-slate-50 rounded-2xl border">
      <div className="flex items-center gap-3 justify-center mb-4">
        <div className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center">
          <Stamp size={20} />
        </div>
        <h3 className="text-lg font-semibold">Watermark Settings</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Maximize className="h-4 w-4 text-muted-foreground" />
              <Label>Font Size</Label>
              <span className="text-sm text-muted-foreground ml-auto">{fontSize}pt</span>
            </div>
            <Slider
              value={[fontSize]}
              onValueChange={(value) => setFontSize(value[0])}
              min={20}
              max={120}
              step={5}
              className="w-full"
              data-testid="slider-font-size"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Label>Font Family</Label>
            </div>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger data-testid="select-font-family">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((font) => (
                  <SelectItem key={font.id} value={font.id}>
                    <span className={font.preview}>{font.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <Label>Orientation</Label>
            </div>
            <RadioGroup 
              value={String(orientation)} 
              onValueChange={(v) => setOrientation(Number(v))}
              className="grid grid-cols-2 gap-2"
            >
              {ORIENTATIONS.map((o) => (
                <div key={o.value}>
                  <RadioGroupItem value={String(o.value)} id={`orient-${o.value}`} className="peer sr-only" />
                  <Label
                    htmlFor={`orient-${o.value}`}
                    className={cn(
                      "flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      orientation === o.value
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    )}
                    data-testid={`radio-orientation-${o.value}`}
                  >
                    <span className="text-lg">{o.icon}</span>
                    <span className="text-sm">{o.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-xl border">
        <p className="text-sm text-muted-foreground mb-4 text-center">Preview</p>
        <div className="flex items-center justify-center min-h-[120px] bg-slate-50 rounded-lg overflow-hidden">
          <p 
            className={cn("text-gray-400", selectedFont?.preview)}
            style={{ 
              opacity: opacity / 100,
              fontSize: `${Math.min(fontSize, 48)}px`,
              transform: `rotate(${orientation}deg)`,
              transition: "all 0.3s ease"
            }}
          >
            {watermarkText || "WATERMARK"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3 italic">
          Your document is about to get stamped with authority!
        </p>
      </div>
    </div>
  );
}
