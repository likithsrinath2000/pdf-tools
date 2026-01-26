import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Bold, 
  Italic, 
  Underline,
  ArrowUpLeft,
  ArrowUp,
  ArrowUpRight,
  ArrowLeft,
  Circle,
  ArrowRight,
  ArrowDownLeft,
  ArrowDown,
  ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PageNumberEditorProps {
  files: File[];
  onOptionsChange?: (options: PageNumberOptions) => void;
}

export interface PageNumberOptions {
  position: string;
  marginX: number;
  marginY: number;
  startNumber: number;
  startPage: number;
  endPage: number | null;
  font: string;
  fontSize: number;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  format: string;
}

export function PageNumberEditor({ files, onOptionsChange }: PageNumberEditorProps) {
  const [view, setView] = useState<"pages" | "files">("pages");
  const [position, setPosition] = useState<number>(7);
  const [marginX, setMarginX] = useState(40);
  const [marginY, setMarginY] = useState(30);
  const [startNumber, setStartNumber] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState<number | null>(null);
  
  const [font, setFont] = useState("Helvetica");
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState("#000000");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [format, setFormat] = useState("number");

  const positions = [
    { id: 0, label: "Top Left", icon: ArrowUpLeft, positionCode: "top-left" },
    { id: 1, label: "Top Center", icon: ArrowUp, positionCode: "top-center" },
    { id: 2, label: "Top Right", icon: ArrowUpRight, positionCode: "top-right" },
    { id: 3, label: "Middle Left", icon: ArrowLeft, positionCode: "middle-left" },
    { id: 4, label: "Middle Center", icon: Circle, positionCode: "middle-center" },
    { id: 5, label: "Middle Right", icon: ArrowRight, positionCode: "middle-right" },
    { id: 6, label: "Bottom Left", icon: ArrowDownLeft, positionCode: "bottom-left" },
    { id: 7, label: "Bottom Center", icon: ArrowDown, positionCode: "bottom-center" },
    { id: 8, label: "Bottom Right", icon: ArrowDownRight, positionCode: "bottom-right" },
  ];

  useEffect(() => {
    if (onOptionsChange) {
      onOptionsChange({
        position: positions[position].positionCode,
        marginX,
        marginY,
        startNumber,
        startPage,
        endPage,
        font,
        fontSize,
        color,
        isBold,
        isItalic,
        isUnderline,
        format
      });
    }
  }, [position, marginX, marginY, startNumber, startPage, endPage, font, fontSize, color, isBold, isItalic, isUnderline, format]);

  const getPreviewPosition = (pos: number) => {
    const row = Math.floor(pos / 3);
    const col = pos % 3;
    
    const topOffset = row === 0 ? marginY : row === 1 ? '50%' : `calc(100% - ${marginY}px)`;
    const leftOffset = col === 0 ? marginX : col === 1 ? '50%' : `calc(100% - ${marginX}px)`;
    const transform = `translate(${col === 1 ? '-50%' : col === 2 ? '-100%' : '0'}, ${row === 1 ? '-50%' : row === 2 ? '-100%' : '0'})`;
    
    return { top: topOffset, left: leftOffset, transform };
  };

  const formatNumber = (num: number) => {
    switch (format) {
      case "roman": return toRoman(num);
      case "letter": return toLetter(num);
      case "page-of": return `Page ${num} of X`;
      default: return num.toString();
    }
  };

  const toRoman = (num: number): string => {
    const romanNumerals = [
      { value: 1000, numeral: 'M' }, { value: 900, numeral: 'CM' },
      { value: 500, numeral: 'D' }, { value: 400, numeral: 'CD' },
      { value: 100, numeral: 'C' }, { value: 90, numeral: 'XC' },
      { value: 50, numeral: 'L' }, { value: 40, numeral: 'XL' },
      { value: 10, numeral: 'X' }, { value: 9, numeral: 'IX' },
      { value: 5, numeral: 'V' }, { value: 4, numeral: 'IV' },
      { value: 1, numeral: 'I' }
    ];
    let result = '';
    for (const { value, numeral } of romanNumerals) {
      while (num >= value) { result += numeral; num -= value; }
    }
    return result.toLowerCase();
  };

  const toLetter = (num: number): string => {
    let result = '';
    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result.toLowerCase();
  };

  return (
    <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6">
      <div className="flex-1 bg-slate-100 rounded-xl border p-4 min-h-[500px] flex flex-col">
        <div className="flex justify-center mb-4">
          <div className="bg-white p-1 rounded-lg border shadow-sm inline-flex">
            <button 
              onClick={() => setView("pages")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                view === "pages" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
              )}
              data-testid="view-pages"
            >
              Pages view
            </button>
            <button 
              onClick={() => setView("files")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                view === "files" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
              )}
              data-testid="view-files"
            >
              Files view
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-auto p-8">
           <div className="w-full max-w-[400px] aspect-[1/1.414] bg-white shadow-xl border relative">
              <div className="absolute inset-8 border border-dashed border-slate-200" />
              <div className="absolute inset-0 p-8 flex flex-col gap-4 opacity-10">
                 <div className="h-4 w-3/4 bg-slate-900 rounded" />
                 <div className="h-4 w-full bg-slate-900 rounded" />
                 <div className="h-4 w-full bg-slate-900 rounded" />
                 <div className="h-32 w-full bg-slate-900 rounded" />
                 <div className="h-4 w-full bg-slate-900 rounded" />
                 <div className="h-4 w-5/6 bg-slate-900 rounded" />
              </div>

              <div 
                className="absolute pointer-events-none"
                style={{
                  ...getPreviewPosition(position),
                  fontFamily: font,
                  fontSize: `${fontSize}px`,
                  color: color,
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal',
                  textDecoration: isUnderline ? 'underline' : 'none'
                }}
              >
                {formatNumber(startNumber)}
              </div>
           </div>
        </div>
      </div>

      <div className="w-full md:w-80 bg-white rounded-xl border shadow-sm p-6 space-y-6 h-fit max-h-[80vh] overflow-y-auto">
        <div className="space-y-3">
          <Label className="text-base font-semibold">Location on page</Label>
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border">
            {positions.map((pos) => {
              const IconComponent = pos.icon;
              return (
                <button
                  key={pos.id}
                  onClick={() => setPosition(pos.id)}
                  className={cn(
                    "aspect-square rounded-md flex items-center justify-center hover:bg-white hover:shadow-sm transition-all border-2",
                    position === pos.id 
                      ? "bg-primary/10 border-primary text-primary shadow-sm" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                  title={pos.label}
                  data-testid={`position-${pos.positionCode}`}
                >
                  <IconComponent size={18} strokeWidth={position === pos.id ? 2.5 : 2} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <Label className="text-base font-semibold">Margins</Label>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm text-muted-foreground">Horizontal (X)</Label>
                <span className="text-sm font-medium">{marginX}px</span>
              </div>
              <Slider
                value={[marginX]}
                onValueChange={(v) => setMarginX(v[0])}
                min={10}
                max={100}
                step={5}
                className="cursor-pointer"
                data-testid="margin-x-slider"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm text-muted-foreground">Vertical (Y)</Label>
                <span className="text-sm font-medium">{marginY}px</span>
              </div>
              <Slider
                value={[marginY]}
                onValueChange={(v) => setMarginY(v[0])}
                min={10}
                max={100}
                step={5}
                className="cursor-pointer"
                data-testid="margin-y-slider"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Label className="text-base font-semibold">Number Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger data-testid="number-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number">1, 2, 3...</SelectItem>
              <SelectItem value="roman">i, ii, iii...</SelectItem>
              <SelectItem value="letter">a, b, c...</SelectItem>
              <SelectItem value="page-of">Page X of Y</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Start #</Label>
            <Input 
              type="number" 
              value={startNumber} 
              onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)} 
              min={1}
              data-testid="start-number"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">From Pg</Label>
            <Input 
              type="number" 
              value={startPage} 
              onChange={(e) => setStartPage(parseInt(e.target.value) || 1)} 
              min={1}
              data-testid="start-page"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">To Pg</Label>
            <Input 
              type="number" 
              value={endPage || ''} 
              onChange={(e) => setEndPage(e.target.value ? parseInt(e.target.value) : null)} 
              min={1}
              placeholder="All"
              data-testid="end-page"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Text Style</Label>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Font</Label>
              <Select value={font} onValueChange={setFont}>
                <SelectTrigger data-testid="font-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times-Roman">Times Roman</SelectItem>
                  <SelectItem value="Courier">Courier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <Label className="text-xs">Size</Label>
               <Input 
                 type="number" 
                 value={fontSize} 
                 onChange={(e) => setFontSize(parseInt(e.target.value) || 12)}
                 min={6}
                 max={72}
                 data-testid="font-size"
               />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-2 items-center">
              <Input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)} 
                className="w-10 h-10 p-1 rounded cursor-pointer"
                data-testid="color-picker"
              />
              <span className="text-sm text-muted-foreground uppercase">{color}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsBold(!isBold)}
              className={cn(isBold && "bg-primary/10 border-primary text-primary")}
              data-testid="bold-toggle"
            >
              <Bold size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsItalic(!isItalic)}
              className={cn(isItalic && "bg-primary/10 border-primary text-primary")}
              data-testid="italic-toggle"
            >
              <Italic size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsUnderline(!isUnderline)}
              className={cn(isUnderline && "bg-primary/10 border-primary text-primary")}
              data-testid="underline-toggle"
            >
              <Underline size={16} />
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground text-center pt-2">
          Pro tip: Numbers will dance into place on your PDF! 💃
        </p>
      </div>
    </div>
  );
}
