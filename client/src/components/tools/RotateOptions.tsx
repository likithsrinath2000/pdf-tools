import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RotateCw, RotateCcw } from "lucide-react";

interface RotateOptionsProps {
  onChange: (angle: number) => void;
}

export function RotateOptions({ onChange }: RotateOptionsProps) {
  const [angle, setAngle] = useState(90);

  useEffect(() => {
    onChange(angle);
  }, [angle, onChange]);

  const options = [
    { value: 90, label: "90° Right", icon: RotateCw, description: "Quarter turn clockwise" },
    { value: 180, label: "180°", icon: RotateCw, description: "Flip upside down (for those upside-down scanners)" },
    { value: 270, label: "90° Left", icon: RotateCcw, description: "Quarter turn counter-clockwise" },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <h3 className="text-lg font-semibold text-center text-muted-foreground">
        Select Rotation Angle
      </h3>

      <RadioGroup 
        value={angle.toString()} 
        onValueChange={(v) => setAngle(parseInt(v))}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {options.map((option) => (
          <div key={option.value}>
            <RadioGroupItem value={option.value.toString()} id={`rotate-${option.value}`} className="peer sr-only" />
            <Label
              htmlFor={`rotate-${option.value}`}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-muted bg-white p-6 cursor-pointer hover:border-primary/50 transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-purple-50/50"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
                <option.icon size={32} className="text-purple-600" />
              </div>
              <div className="font-bold text-lg">{option.label}</div>
              <p className="text-sm text-muted-foreground text-center">{option.description}</p>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
