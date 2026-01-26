import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenTool, Type, RotateCcw, Loader2, ZoomIn, Download, Upload } from "lucide-react";

interface SignatureOptionsProps {
  file?: File;
  onChange: (options: { 
    signatureText?: string; 
    signatureImage?: string;
    signatureType: 'text' | 'drawn';
    signatureScale: number;
    position: { page: number; x: number; y: number } 
  }) => void;
}

export function SignatureOptions({ file, onChange }: SignatureOptionsProps) {
  const [signatureType, setSignatureType] = useState<'text' | 'drawn'>('drawn');
  const [signatureText, setSignatureText] = useState("");
  const [signatureImage, setSignatureImage] = useState<string>("");
  const [position, setPosition] = useState({ x: 400, y: 100 });
  const [signatureScale, setSignatureScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState("#1e3a5f");
  const [penSize, setPenSize] = useState(3);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 595, height: 842 });
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (file) {
      setLoadingPreview(true);
      const formData = new FormData();
      formData.append('file', file);
      
      fetch('/api/pdf-preview', {
        method: 'POST',
        body: formData,
      })
        .then(res => res.json())
        .then(data => {
          if (data.previewImage) {
            setPdfPreview(data.previewImage);
          }
          if (data.width && data.height) {
            setPdfDimensions({ width: data.width, height: data.height });
          }
        })
        .catch(console.error)
        .finally(() => setLoadingPreview(false));
    }
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = penColor;
        ctx.fillStyle = penColor;
        ctx.lineWidth = penSize;
        ctxRef.current = ctx;
      }
    }
  }, [penColor, penSize]);

  useEffect(() => {
    if (signatureType === 'text') {
      onChangeRef.current({
        signatureText: signatureText || "Signature",
        signatureType: 'text',
        signatureScale,
        position: { page: 1, x: position.x, y: position.y }
      });
    } else {
      onChangeRef.current({
        signatureImage,
        signatureType: 'drawn',
        signatureScale,
        position: { page: 1, x: position.x, y: position.y }
      });
    }
  }, [signatureText, signatureImage, signatureType, position, signatureScale]);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.arc(x, y, penSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }, [getCoordinates, penSize]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, getCoordinates]);

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        setSignatureImage(canvas.toDataURL('image/png'));
      }
    }
  }, [isDrawing]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureImage("");
    }
  }, []);

  const downloadSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && signatureImage) {
      const link = document.createElement('a');
      link.download = 'my-signature.png';
      link.href = signatureImage;
      link.click();
    }
  }, [signatureImage]);

  const uploadSignatureRef = useRef<HTMLInputElement>(null);
  
  const handleSignatureUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          const ctx = ctxRef.current;
          if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1);
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            setSignatureImage(canvas.toDataURL('image/png'));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  }, []);

  const handlePositionClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * pdfDimensions.width);
    const y = Math.round(pdfDimensions.height - ((e.clientY - rect.top) / rect.height) * pdfDimensions.height);
    setPosition({ x, y });
  };

  const positionPercentage = {
    left: `${(position.x / pdfDimensions.width) * 100}%`,
    top: `${((pdfDimensions.height - position.y) / pdfDimensions.height) * 100}%`
  };

  const signaturePreviewSize = 80 * signatureScale;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 p-6 bg-slate-50 rounded-2xl border">
      <div className="flex items-center gap-3 justify-center mb-4">
        <div className="w-10 h-10 bg-slate-700 text-white rounded-xl flex items-center justify-center">
          <PenTool size={20} />
        </div>
        <h3 className="text-lg font-semibold">Digital Signature</h3>
      </div>

      <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as 'text' | 'drawn')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="drawn" className="flex items-center gap-2">
            <PenTool size={16} /> Draw Signature
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <Type size={16} /> Type Signature
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drawn" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Draw your signature below</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {['#1e3a5f', '#000000', '#1a4d2e'].map(color => (
                    <button
                      key={color}
                      onClick={() => setPenColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${penColor === color ? 'scale-125 border-white ring-2 ring-primary' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={clearCanvas}>
                  <RotateCcw size={14} className="mr-1" /> Clear
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="file"
                ref={uploadSignatureRef}
                onChange={handleSignatureUpload}
                accept="image/*"
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => uploadSignatureRef.current?.click()}
                className="flex-1"
              >
                <Upload size={14} className="mr-1" /> Upload Saved Signature
              </Button>
              {signatureImage && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadSignature}
                  className="flex-1"
                >
                  <Download size={14} className="mr-1" /> Save Signature
                </Button>
              )}
            </div>
            <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-2">
              <canvas
                ref={canvasRef}
                width={500}
                height={150}
                className="w-full h-[150px] cursor-crosshair touch-none rounded"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                data-testid="canvas-signature"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Use your mouse, trackpad, or finger (on touchscreens) to draw your signature
            </p>
          </div>

          {signatureImage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-sm text-green-700">Signature captured! Looking fancy.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="text" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="signature-text">Type your signature</Label>
            <Input
              id="signature-text"
              placeholder="Type your name"
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              className="text-xl font-serif italic"
              data-testid="input-signature-text"
            />
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
        </TabsContent>
      </Tabs>

      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <ZoomIn size={16} /> Signature Size
          </Label>
          <span className="text-sm text-muted-foreground">{Math.round(signatureScale * 100)}%</span>
        </div>
        <Slider
          value={[signatureScale]}
          onValueChange={([value]) => setSignatureScale(value)}
          min={0.5}
          max={2}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>50%</span>
          <span>100%</span>
          <span>200%</span>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <Label>Click on the PDF to place your signature</Label>
        <div 
          className="relative bg-white border-2 border-slate-200 rounded-lg cursor-crosshair overflow-hidden shadow-inner mx-auto"
          style={{ 
            aspectRatio: `${pdfDimensions.width}/${pdfDimensions.height}`,
            maxHeight: '500px'
          }}
          onClick={handlePositionClick}
          data-testid="signature-position-picker"
        >
          {loadingPreview ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : pdfPreview ? (
            <img 
              src={pdfPreview} 
              alt="PDF Preview" 
              className="w-full h-full object-contain pointer-events-none"
            />
          ) : (
            <>
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border border-slate-100" />
                ))}
              </div>
              <div className="absolute inset-x-4 top-6 h-3 bg-slate-100 rounded" />
              <div className="absolute inset-x-4 top-12 h-2 bg-slate-100 rounded w-3/4" />
              <div className="absolute inset-x-4 top-20 space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-1.5 bg-slate-50 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
                ))}
              </div>
            </>
          )}

          <div 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-150"
            style={{ left: positionPercentage.left, top: positionPercentage.top }}
          >
            <div 
              className="bg-blue-500/20 border-2 border-blue-500 border-dashed rounded flex items-center justify-center"
              style={{ 
                width: `${signaturePreviewSize}px`, 
                height: `${signaturePreviewSize * 0.4}px`,
                minWidth: '60px'
              }}
            >
              {signatureType === 'drawn' && signatureImage ? (
                <img src={signatureImage} alt="Signature" className="max-h-full max-w-full object-contain" />
              ) : signatureType === 'text' && signatureText ? (
                <span className="font-serif italic text-blue-900 text-xs truncate px-1">{signatureText}</span>
              ) : (
                <span className="text-xs text-blue-600">Signature</span>
              )}
            </div>
          </div>

          <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-muted-foreground bg-white/80 py-1">
            Click anywhere to position your signature
          </p>
        </div>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800 text-center">
          Your signature ({Math.round(signatureScale * 100)}% size) will appear on page 1
        </p>
      </div>
    </div>
  );
}
