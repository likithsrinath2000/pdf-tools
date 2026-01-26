import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToolCard } from "@/components/ToolCard";
import { TOOLS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ArrowRight, Layers, Zap, FileOutput, FileInput, Edit3, Shield, Image, FilePlus, Clock } from "lucide-react";
import { getRecentTools } from "@/lib/preferences";

export default function Home() {
  const [recentToolIds, setRecentToolIds] = useState<string[]>([]);
  const favorites = ["merge-pdf", "split-pdf", "compress-pdf", "pdf-to-word", "word-to-pdf", "edit-pdf"];

  useEffect(() => {
    setRecentToolIds(getRecentTools());
  }, []);

  const recentToolsData = recentToolIds
    .map(id => TOOLS.find(t => t.id === id))
    .filter(Boolean) as typeof TOOLS;

  const organizeTools = TOOLS.filter(t => t.category === "organize");
  const optimizeTools = TOOLS.filter(t => t.category === "optimize");
  const editTools = TOOLS.filter(t => t.category === "edit");
  const securityTools = TOOLS.filter(t => t.category === "security");
  const convertToPdfTools = TOOLS.filter(t => t.category === "convert-to-pdf");
  const convertFromPdfTools = TOOLS.filter(t => t.category === "convert-from-pdf");
  const imageTools = TOOLS.filter(t => t.category === "image-tools");
  const createOfficeTools = TOOLS.filter(t => t.category === "create-office");
  
  const ToolSection = ({ title, icon: Icon, color, tools }: { title: string; icon: any; color: string; tools: typeof TOOLS }) => (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center shadow-lg`}>
          <Icon size={20} />
        </div>
        <h2 className="text-xl font-bold font-display text-slate-900">{title}</h2>
        <span className="text-sm text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{tools.length} tools</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tools.map((tool, i) => (
          <div key={tool.id} className="animate-in fade-in zoom-in-50 duration-300" style={{ animationDelay: `${i * 30}ms` }}>
            <ToolCard {...tool} />
          </div>
        ))}
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20 px-4 md:px-8">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-slate-900 leading-[1.1]">
            Every tool you need to work with PDFs
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            All the tools you need to be more productive and work smarter with documents. 
            100% free and easy to use. No signup required!
          </p>
        </div>

        {/* Recently Used Tools - Only shown when user has history */}
        {recentToolsData.length > 0 && (
          <div className="max-w-7xl mx-auto mb-16" data-testid="recently-used-section">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center shadow-lg">
                <Clock size={20} />
              </div>
              <h2 className="text-xl font-bold font-display text-slate-900">Recently Used</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentToolsData.map((tool, i) => (
                <div key={tool.id} className="animate-in fade-in zoom-in-50 duration-500" style={{ animationDelay: `${i * 50}ms` }}>
                  <ToolCard {...tool} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most Popular Tools - Horizontal */}
        <div className="max-w-7xl mx-auto mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center shadow-lg">
              <Zap size={20} />
            </div>
            <h2 className="text-xl font-bold font-display text-slate-900">Most Popular</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {TOOLS.filter(t => favorites.includes(t.id)).map((tool, i) => (
              <div key={tool.id} className="animate-in fade-in zoom-in-50 duration-500" style={{ animationDelay: `${i * 50}ms` }}>
                <ToolCard {...tool} />
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Organized Categories */}
          <ToolSection title="Organize PDF" icon={Layers} color="bg-red-500" tools={organizeTools} />
          <ToolSection title="Edit PDF" icon={Edit3} color="bg-purple-500" tools={editTools} />
          <ToolSection title="Optimize & Repair" icon={Zap} color="bg-green-500" tools={optimizeTools} />
          <ToolSection title="Security" icon={Shield} color="bg-slate-700" tools={securityTools} />
          <ToolSection title="Convert to PDF" icon={FileInput} color="bg-yellow-500" tools={convertToPdfTools} />
          <ToolSection title="Convert from PDF" icon={FileOutput} color="bg-orange-500" tools={convertFromPdfTools} />
          <ToolSection title="Image Tools" icon={Image} color="bg-blue-600" tools={imageTools} />
          <ToolSection title="Create Office Documents" icon={FilePlus} color="bg-indigo-600" tools={createOfficeTools} />
        </div>

        {/* Feature Section */}
        <div className="max-w-7xl mx-auto mt-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold font-display">
              Because life is too short to fight with printers
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We created these tools so you don't have to throw your laptop out the window. 
              Merge, split, and compress PDFs without crying. It's almost fun. Almost.
              <br/><br/>
              (We also promise not to ask you for your mother's maiden name just to rotate a page.)
            </p>
          </div>
          <div className="relative h-64 md:h-80 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden shadow-2xl flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-slate-600 font-medium">Your documents, simplified.</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
