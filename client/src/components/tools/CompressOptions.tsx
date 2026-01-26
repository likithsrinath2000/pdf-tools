import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2 } from "lucide-react";

interface CompressOptionsProps {
  onChange: (quality: string) => void;
}

export function CompressOptions({ onChange }: CompressOptionsProps) {
  const [quality, setQuality] = useState("medium");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current(quality);
  }, [quality]);

  return (
    <div className="w-full max-w-3xl">
      <h3 className="text-lg font-semibold mb-6 text-center text-muted-foreground">
        Select Compression Level
      </h3>
      
      <RadioGroup 
        value={quality} 
        onValueChange={setQuality} 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div>
          <RadioGroupItem value="low" id="extreme" className="peer sr-only" />
          <Label
            htmlFor="extreme"
            className="relative flex flex-col gap-4 rounded-xl border-2 border-muted bg-white p-6 cursor-pointer hover:border-primary/50 transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-green-50/50"
          >
            <div className="absolute top-4 right-4 opacity-0 peer-data-[state=checked]:opacity-100 text-primary">
               <CheckCircle2 size={20} className="text-green-600" />
            </div>
            
            <div className="font-bold text-lg text-slate-800">Extreme Compression</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Less quality, high compression. Perfect for email attachments that need to squeeze through.
            </p>
            <div className="mt-auto pt-4 text-xs font-bold text-green-700">
               -70% File Size
            </div>
          </Label>
        </div>

        <div>
          <RadioGroupItem value="medium" id="recommended" className="peer sr-only" />
          <Label
            htmlFor="recommended"
            className="relative flex flex-col gap-4 rounded-xl border-2 border-muted bg-white p-6 cursor-pointer hover:border-primary/50 transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-green-50/50"
          >
            <div className="absolute top-4 right-4 opacity-0 peer-data-[state=checked]:opacity-100 text-primary">
               <CheckCircle2 size={20} className="text-green-600" />
            </div>
            
            <div className="font-bold text-lg text-slate-800">Recommended</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Good quality, good compression. The goldilocks zone of PDF optimization.
            </p>
            <div className="mt-auto pt-4 text-xs font-bold text-green-700">
               -40% File Size
            </div>
          </Label>
        </div>

        <div>
          <RadioGroupItem value="high" id="less" className="peer sr-only" />
          <Label
            htmlFor="less"
            className="relative flex flex-col gap-4 rounded-xl border-2 border-muted bg-white p-6 cursor-pointer hover:border-primary/50 transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-green-50/50"
          >
            <div className="absolute top-4 right-4 opacity-0 peer-data-[state=checked]:opacity-100 text-primary">
               <CheckCircle2 size={20} className="text-green-600" />
            </div>
            
            <div className="font-bold text-lg text-slate-800">Less Compression</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              High quality, less compression. For when every pixel matters.
            </p>
            <div className="mt-auto pt-4 text-xs font-bold text-green-700">
               -10% File Size
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
