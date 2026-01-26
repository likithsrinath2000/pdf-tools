import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Presentation, GripVertical } from "lucide-react";
import { Reorder } from "framer-motion";

interface Slide {
  id: string;
  title: string;
  content: string;
}

interface PowerPointEditorProps {
  onSlidesChange: (slides: { title: string, content: string }[]) => void;
}

export function PowerPointEditor({ onSlidesChange }: PowerPointEditorProps) {
  const [slides, setSlides] = useState<Slide[]>([
    { id: "slide-1", title: "Welcome!", content: "Your presentation starts here.\n\nAdd your main points below." },
    { id: "slide-2", title: "Second Slide", content: "More amazing content goes here!" }
  ]);
  const [activeSlide, setActiveSlide] = useState<string>("slide-1");
  const onSlidesChangeRef = useRef(onSlidesChange);
  onSlidesChangeRef.current = onSlidesChange;

  useEffect(() => {
    onSlidesChangeRef.current(slides.map(s => ({ title: s.title, content: s.content })));
  }, [slides]);

  const addSlide = () => {
    const newId = `slide-${Date.now()}`;
    setSlides([...slides, { 
      id: newId, 
      title: `Slide ${slides.length + 1}`, 
      content: "Add your content here..." 
    }]);
    setActiveSlide(newId);
  };

  const removeSlide = (id: string) => {
    if (slides.length > 1) {
      const newSlides = slides.filter(s => s.id !== id);
      setSlides(newSlides);
      if (activeSlide === id) {
        setActiveSlide(newSlides[0].id);
      }
    }
  };

  const updateSlide = (id: string, field: 'title' | 'content', value: string) => {
    setSlides(slides.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const currentSlide = slides.find(s => s.id === activeSlide) || slides[0];

  return (
    <div className="w-full max-w-5xl space-y-4">
      <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Presentation className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-orange-900">Create PowerPoint Presentation</h3>
        </div>
        <p className="text-sm text-orange-700">
          Add slides, write titles and content, then click "Create PPTX" to download your presentation!
        </p>
      </div>

      <div className="flex gap-4">
        <div className="w-48 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Slides</span>
            <Button variant="outline" size="sm" onClick={addSlide}>
              <Plus size={14} />
            </Button>
          </div>

          <Reorder.Group 
            axis="y" 
            values={slides} 
            onReorder={setSlides}
            className="space-y-2"
          >
            {slides.map((slide, idx) => (
              <Reorder.Item
                key={slide.id}
                value={slide}
                className="cursor-grab active:cursor-grabbing"
              >
                <div
                  onClick={() => setActiveSlide(slide.id)}
                  className={`group relative p-2 rounded-lg border-2 transition-all ${
                    activeSlide === slide.id 
                      ? "border-orange-500 bg-orange-50" 
                      : "border-slate-200 bg-white hover:border-orange-300"
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <GripVertical size={12} className="text-slate-300" />
                    <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                  </div>
                  <div className="text-xs font-medium truncate text-slate-700">
                    {slide.title || "Untitled"}
                  </div>
                  {slides.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        <div className="flex-1 bg-white rounded-lg border shadow-sm p-6">
          <div className="aspect-video bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-2 border-dashed border-slate-200 p-8 flex flex-col">
            <Input
              value={currentSlide.title}
              onChange={(e) => updateSlide(currentSlide.id, 'title', e.target.value)}
              className="text-2xl font-bold border-0 bg-transparent text-center mb-4 focus-visible:ring-0"
              placeholder="Slide Title"
            />
            <Textarea
              value={currentSlide.content}
              onChange={(e) => updateSlide(currentSlide.id, 'content', e.target.value)}
              className="flex-1 border-0 bg-transparent resize-none text-lg focus-visible:ring-0"
              placeholder="Add your slide content here..."
            />
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Drag slides to reorder. Click a slide to edit it. Use the + button to add more slides.
      </p>
    </div>
  );
}
