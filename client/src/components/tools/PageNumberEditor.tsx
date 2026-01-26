import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold, 
  Italic, 
  Underline,
  Grid3X3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PageNumberEditorProps {
  files: File[];
}

export function PageNumberEditor({ files }: PageNumberEditorProps) {
  const [view, setView] = useState<"pages" | "files">("pages");
  const [position, setPosition] = useState<number>(8); // 0-8 grid positions
  const [margin, setMargin] = useState("recommended");
  const [startNumber, setStartNumber] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1); // Would be dynamic based on PDF length
  
  // Style options
  const [font, setFont] = useState("Arial");
  const [fontSize, setFontSize] = useState(12);
  const [color, setColor] = useState("#000000");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Grid positions visualization
  const positions = [
    { id: 0, label: "Top Left" },
    { id: 1, label: "Top Center" },
    { id: 2, label: "Top Right" },
    { id: 3, label: "Middle Left" },
    { id: 4, label: "Middle Center" },
    { id: 5, label: "Middle Right" },
    { id: 6, label: "Bottom Left" },
    { id: 7, label: "Bottom Center" },
    { id: 8, label: "Bottom Right" },
  ];

  return (
    <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6">
      {/* Main Preview Area */}
      <div className="flex-1 bg-slate-100 rounded-xl border p-4 min-h-[500px] flex flex-col">
        <div className="flex justify-center mb-4">
          <div className="bg-white p-1 rounded-lg border shadow-sm inline-flex">
            <button 
              onClick={() => setView("pages")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                view === "pages" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Pages view
            </button>
            <button 
              onClick={() => setView("files")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                view === "files" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Files view
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-auto p-8">
           {/* Mock PDF Page Preview */}
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

              {/* Page Number Overlay Preview */}
              <div className="absolute inset-0 p-4 grid grid-cols-3 grid-rows-3 gap-4 pointer-events-none">
                {positions.map((pos) => (
                  <div key={pos.id} className="flex items-center justify-center">
                    {position === pos.id && (
                       <span 
                         style={{
                           fontFamily: font,
                           fontSize: `${fontSize}px`,
                           color: color,
                           fontWeight: isBold ? 'bold' : 'normal',
                           fontStyle: isItalic ? 'italic' : 'normal',
                           textDecoration: isUnderline ? 'underline' : 'none'
                         }}
                       >
                         {startNumber}
                       </span>
                    )}
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* Options Panel */}
      <div className="w-full md:w-80 bg-white rounded-xl border shadow-sm p-6 space-y-8 h-fit">
        <div className="space-y-4">
          <Label className="text-base font-semibold">Location on page</Label>
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg border">
            {positions.map((pos) => (
              <button
                key={pos.id}
                onClick={() => setPosition(pos.id)}
                className={cn(
                  "aspect-square rounded flex items-center justify-center hover:bg-white hover:shadow-sm transition-all border border-transparent",
                  position === pos.id ? "bg-white shadow-sm border-primary/50 text-primary" : "text-slate-400"
                )}
                title={pos.label}
              >
                <Grid3X3 size={16} />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold">Margins</Label>
          <Select value={margin} onValueChange={setMargin}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="big">Big</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Start Num</Label>
            <Input 
              type="number" 
              value={startNumber} 
              onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)} 
              min={1} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Start Page</Label>
            <Input 
              type="number" 
              value={startPage} 
              onChange={(e) => setStartPage(parseInt(e.target.value) || 1)} 
              min={1} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">End Page</Label>
            <Input 
              type="number" 
              value={endPage} 
              onChange={(e) => setEndPage(parseInt(e.target.value) || 1)} 
              min={1} 
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Text Style</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Font</Label>
              <Select value={font} onValueChange={setFont}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <Label className="text-xs">Size</Label>
               <Input 
                 type="number" 
                 value={fontSize} 
                 onChange={(e) => setFontSize(parseInt(e.target.value) || 12)} 
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
              />
              <span className="text-sm text-muted-foreground uppercase">{color}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsBold(!isBold)}
              className={cn(isBold && "bg-slate-100 border-primary text-primary")}
            >
              <Bold size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsItalic(!isItalic)}
              className={cn(isItalic && "bg-slate-100 border-primary text-primary")}
            >
              <Italic size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsUnderline(!isUnderline)}
              className={cn(isUnderline && "bg-slate-100 border-primary text-primary")}
            >
              <Underline size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
