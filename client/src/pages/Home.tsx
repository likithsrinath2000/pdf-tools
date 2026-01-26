import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToolCard } from "@/components/ToolCard";
import { TOOLS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Home() {
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
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full bg-white hover:bg-slate-50">
              Read Guide
            </Button>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TOOLS.map((tool, i) => (
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
              The PDF software to keep your business moving
            </h2>
            <p className="text-lg text-muted-foreground">
              We provide all the features you need to manage your documents effectively. 
              Our tools are secure, fast, and easy to use on any device.
            </p>
            <Button variant="link" className="text-primary p-0 h-auto text-lg font-semibold group">
              Learn more about Premium <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
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
