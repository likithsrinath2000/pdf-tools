import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers } from "lucide-react";

interface ExtractPagesOptionsProps {
  onChange: (pages: number[]) => void;
}

export function ExtractPagesOptions({ onChange }: ExtractPagesOptionsProps) {
  const [pagesInput, setPagesInput] = useState("");
  const [error, setError] = useState("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const pages = parsePageNumbers(pagesInput);
    if (pages.length > 0 || pagesInput === "") {
      setError("");
      onChangeRef.current(pages);
    }
  }, [pagesInput]);

  const parsePageNumbers = (input: string): number[] => {
    if (!input.trim()) return [];
    
    const pages: number[] = [];
    const parts = input.split(",");
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            if (!pages.includes(i)) pages.push(i);
          }
        }
      } else {
        const num = parseInt(trimmed);
        if (!isNaN(num) && !pages.includes(num)) {
          pages.push(num);
        }
      }
    }
    
    return pages.sort((a, b) => a - b);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6 bg-slate-50 rounded-2xl border">
      <div className="flex items-center gap-3 justify-center mb-4">
        <div className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center">
          <Layers size={20} />
        </div>
        <h3 className="text-lg font-semibold">Extract Pages</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pages">Pages to Extract</Label>
          <Input
            id="pages"
            placeholder="e.g., 1, 3, 5-10"
            value={pagesInput}
            onChange={(e) => setPagesInput(e.target.value)}
            data-testid="input-extract-pages"
          />
          <p className="text-xs text-muted-foreground">
            Use commas to separate pages and dashes for ranges. Like ordering pizza toppings, but for pages!
          </p>
        </div>

        {pagesInput && (
          <div className="p-4 bg-white rounded-lg border">
            <p className="text-sm text-muted-foreground">
              Pages to extract: <span className="font-semibold text-slate-800">
                {parsePageNumbers(pagesInput).join(", ") || "None"}
              </span>
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
