import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PenTool } from "lucide-react";

interface SignatureOptionsProps {
  onChange: (options: { signatureText: string; position: { page: number; x: number; y: number } }) => void;
}

export function SignatureOptions({ onChange }: SignatureOptionsProps) {
  const [signatureText, setSignatureText] = useState("");
  const [positionPreset, setPositionPreset] = useState("bottom-right");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const positions: Record<string, { x: number; y: number }> = {
    "bottom-left": { x: 50, y: 50 },
    "bottom-center": { x: 250, y: 50 },
    "bottom-right": { x: 450, y: 50 },
  };

  useEffect(() => {
    onChangeRef.current({
      signatureText: signatureText || "Signature",
      position: { page: 1, ...positions[positionPreset] }
    });
  }, [signatureText, positionPreset]);

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 p-6 bg-slate-50 rounded-2xl border">
      <div className="flex items-center gap-3 justify-center mb-4">
        <div className="w-10 h-10 bg-slate-700 text-white rounded-xl flex items-center justify-center">
          <PenTool size={20} />
        </div>
        <h3 className="text-lg font-semibold">Digital Signature</h3>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="signature-text">Your Signature</Label>
          <Input
            id="signature-text"
            placeholder="Type your name or signature"
            value={signatureText}
            onChange={(e) => setSignatureText(e.target.value)}
            className="text-xl font-serif italic"
            data-testid="input-signature-text"
          />
          <p className="text-xs text-muted-foreground">
            This will be rendered in a fancy italic font. Very official looking!
          </p>
        </div>

        <div className="space-y-3">
          <Label>Position on Page</Label>
          <RadioGroup 
            value={positionPreset} 
            onValueChange={setPositionPreset}
            className="grid grid-cols-3 gap-2"
          >
            {[
              { value: "bottom-left", label: "Left" },
              { value: "bottom-center", label: "Center" },
              { value: "bottom-right", label: "Right" },
            ].map((pos) => (
              <div key={pos.value}>
                <RadioGroupItem value={pos.value} id={pos.value} className="peer sr-only" />
                <Label
                  htmlFor={pos.value}
                  className="flex items-center justify-center rounded-lg border-2 border-muted bg-white p-3 cursor-pointer hover:border-primary/50 transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-slate-100 text-sm font-medium"
                >
                  {pos.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground text-center">
            Signature will appear at the bottom of the first page
          </p>
        </div>

        {signatureText && (
          <div className="p-4 bg-white rounded-lg border">
            <p className="text-sm text-muted-foreground mb-2">Preview</p>
            <div className="flex flex-col items-center">
              <p className="text-2xl font-serif italic text-blue-900">{signatureText}</p>
              <div className="w-40 h-px bg-black mt-1"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
