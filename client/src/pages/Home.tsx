import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToolCard } from "@/components/ToolCard";
import { TOOLS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const favorites = ["merge-pdf", "split-pdf", "compress-pdf", "pdf-to-word", "word-to-pdf"];
  const allTools = TOOLS;
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20 px-4 md:px-8">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-20 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-slate-900 leading-[1.1]">
            Every tool you need to work with PDFs
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            All the tools you need to be more productive and work smarter with documents. 
            100% free and easy to use.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
              Explore All Tools
            </Button>
          </div>
        </div>

        {/* Most Popular Tools */}
        <div className="max-w-7xl mx-auto mb-16">
          <h2 className="text-2xl font-bold font-display text-slate-900 mb-8">Most Popular Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {allTools.filter(t => favorites.includes(t.id)).map((tool, i) => (
              <div key={tool.id} className="animate-in fade-in zoom-in-50 duration-500" style={{ animationDelay: `${i * 50}ms` }}>
                <ToolCard {...tool} />
              </div>
            ))}
          </div>
        </div>

        {/* All Tools Grid */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold font-display text-slate-900 mb-8">All PDF Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {allTools.filter(t => !favorites.includes(t.id)).map((tool, i) => (
              <div key={tool.id} className="animate-in fade-in zoom-in-50 duration-500" style={{ animationDelay: `${i * 50}ms` }}>
                <ToolCard {...tool} />
              </div>
            ))}
          </div>
        </div>

        {/* Feature Section */}
        <div className="max-w-7xl mx-auto mt-32 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold font-display">
              Because life is too short to fight with printers
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We created these tools so you don't have to throw your laptop out the window. 
              Merge, split, and compress PDFs without crying. It's almost fun. Almost.
              <br/><br/>
              (We also promise not to ask you for your mother's maiden name just to rotate a page.)
            </p>
          </div>
          <div className="relative h-64 md:h-96 rounded-3xl bg-slate-200 overflow-hidden shadow-2xl">
            <img 
              src="/src/assets/hero-pdf-tools.png" 
              alt="PDF Tools feature" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
