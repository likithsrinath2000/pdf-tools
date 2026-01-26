import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { CheckCircle2, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompressOptionsProps {
  onChange: (quality: string) => void;
}

export function CompressOptions({ onChange }: CompressOptionsProps) {
  const [quality, setQuality] = useState("medium");
  const [customQuality, setCustomQuality] = useState(50);
  const [useCustom, setUseCustom] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (useCustom) {
      onChangeRef.current(`custom-${customQuality}`);
    } else {
      onChangeRef.current(quality);
    }
  }, [quality, customQuality, useCustom]);

  const handlePresetChange = (value: string) => {
    setQuality(value);
    setUseCustom(false);
  };

  const handleSliderChange = (value: number[]) => {
    setCustomQuality(value[0]);
    setUseCustom(true);
  };

  const getQualityLabel = (value: number) => {
    if (value <= 20) return "Maximum compression";
    if (value <= 40) return "High compression";
    if (value <= 60) return "Balanced";
    if (value <= 80) return "High quality";
    return "Maximum quality";
  };

  return (
    <div className="w-full max-w-3xl space-y-8">
      <h3 className="text-lg font-semibold text-center text-muted-foreground">
        Select Compression Level
      </h3>
      
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
              "relative flex flex-col gap-3 rounded-xl border-2 bg-white p-6 cursor-pointer hover:border-primary/50 transition-all h-full min-h-[180px]",
              quality === "low" && !useCustom 
                ? "border-primary bg-green-50/50" 
                : "border-muted"
            )}
          >
            {quality === "low" && !useCustom && (
              <div className="absolute top-4 right-4 text-green-600">
                <CheckCircle2 size={20} />
              </div>
            )}
            
            <div className="font-bold text-lg text-slate-800">Extreme Compression</div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              Less quality, high compression. Perfect for email attachments.
            </p>
            <div className="pt-2 text-sm font-bold text-green-700">
              -70% File Size
            </div>
          </Label>
        </div>

        <div className="h-full">
          <RadioGroupItem value="medium" id="recommended" className="peer sr-only" />
          <Label
            htmlFor="recommended"
            className={cn(
              "relative flex flex-col gap-3 rounded-xl border-2 bg-white p-6 cursor-pointer hover:border-primary/50 transition-all h-full min-h-[180px]",
              quality === "medium" && !useCustom 
                ? "border-primary bg-green-50/50" 
                : "border-muted"
            )}
          >
            {quality === "medium" && !useCustom && (
              <div className="absolute top-4 right-4 text-green-600">
                <CheckCircle2 size={20} />
              </div>
            )}
            
            <div className="font-bold text-lg text-slate-800">Recommended</div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              Good quality, good compression. The goldilocks zone.
            </p>
            <div className="pt-2 text-sm font-bold text-green-700">
              -40% File Size
            </div>
          </Label>
        </div>

        <div className="h-full">
          <RadioGroupItem value="high" id="less" className="peer sr-only" />
          <Label
            htmlFor="less"
            className={cn(
              "relative flex flex-col gap-3 rounded-xl border-2 bg-white p-6 cursor-pointer hover:border-primary/50 transition-all h-full min-h-[180px]",
              quality === "high" && !useCustom 
                ? "border-primary bg-green-50/50" 
                : "border-muted"
            )}
          >
            {quality === "high" && !useCustom && (
              <div className="absolute top-4 right-4 text-green-600">
                <CheckCircle2 size={20} />
              </div>
            )}
            
            <div className="font-bold text-lg text-slate-800">Less Compression</div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              High quality, less compression. Every pixel matters.
            </p>
            <div className="pt-2 text-sm font-bold text-green-700">
              -10% File Size
            </div>
          </Label>
        </div>
      </RadioGroup>

      <div className={cn(
        "bg-white rounded-xl border-2 p-6 space-y-4 transition-all",
        useCustom ? "border-primary bg-blue-50/30" : "border-muted"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-muted-foreground" />
            <Label className="font-semibold text-slate-800">Fine-tune Compression</Label>
          </div>
          <div className="text-sm font-medium">
            {useCustom ? (
              <span className="text-primary">{getQualityLabel(customQuality)} ({customQuality}%)</span>
            ) : (
              <span className="text-muted-foreground">Use slider for precise control</span>
            )}
          </div>
        </div>
        
        <div className="pt-2 pb-4">
          <Slider
            value={[customQuality]}
            onValueChange={handleSliderChange}
            min={10}
            max={100}
            step={5}
            className="cursor-pointer"
            data-testid="compression-slider"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Smaller file</span>
            <span>Higher quality</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        💡 Fun fact: The average PDF is 80% fluff. We're here to help you defluff it!
      </p>
    </div>
  );
}
