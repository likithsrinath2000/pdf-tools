import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  NavigationMenu, 
  NavigationMenuContent, 
  NavigationMenuItem, 
  NavigationMenuLink, 
  NavigationMenuList, 
  NavigationMenuTrigger 
} from "@/components/ui/navigation-menu";
import { TOOLS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  // Group tools for mega menu
  const organizeTools = TOOLS.filter(t => t.category === "organize");
  const optimizeTools = TOOLS.filter(t => t.category === "optimize");
  const convertToPdfTools = TOOLS.filter(t => t.category === "convert-to-pdf");
  const convertFromPdfTools = TOOLS.filter(t => t.category === "convert-from-pdf");
  const editTools = TOOLS.filter(t => t.category === "edit");
  const securityTools = TOOLS.filter(t => t.category === "security");
  const imageTools = TOOLS.filter(t => t.category === "image-tools");

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b z-50 px-4 md:px-8 flex items-center justify-between shadow-sm">
      <Link href="/">
        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform">
            P
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-foreground group-hover:text-slate-800 transition-colors">
            PDF<span className="text-primary">Tools</span>
          </span>
        </div>
      </Link>
      
      <div className="hidden md:flex items-center gap-1">
        <Link href="/merge-pdf">
           <Button variant="ghost" className={cn("text-sm font-medium hover:bg-red-50 hover:text-red-600", location === "/merge-pdf" && "bg-red-50 text-red-600")}>
             Merge PDF
           </Button>
        </Link>
        <Link href="/split-pdf">
           <Button variant="ghost" className={cn("text-sm font-medium hover:bg-red-50 hover:text-red-600", location === "/split-pdf" && "bg-red-50 text-red-600")}>
             Split PDF
           </Button>
        </Link>
        <Link href="/compress-pdf">
           <Button variant="ghost" className={cn("text-sm font-medium hover:bg-green-50 hover:text-green-600", location === "/compress-pdf" && "bg-green-50 text-green-600")}>
             Compress PDF
           </Button>
        </Link>
        <Link href="/compress-image">
           <Button variant="ghost" className={cn("text-sm font-medium hover:bg-blue-50 hover:text-blue-600", location === "/compress-image" && "bg-blue-50 text-blue-600")}>
             Compress Image
           </Button>
        </Link>

        {/* Mega Menu */}
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent hover:bg-slate-100 font-semibold">
                All Tools
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[800px] p-6 bg-white rounded-xl shadow-xl grid grid-cols-4 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-red-600 uppercase tracking-wider">Organize PDF</h4>
                    <ul className="space-y-2">
                      {organizeTools.map(tool => (
                        <li key={tool.id}>
                          <Link href={`/${tool.id}`} className="block text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 p-1 rounded transition-colors">
                             {tool.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-green-600 uppercase tracking-wider">Optimize</h4>
                    <ul className="space-y-2">
                      {optimizeTools.map(tool => (
                        <li key={tool.id}>
                          <Link href={`/${tool.id}`} className="block text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 p-1 rounded transition-colors">
                             {tool.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <h4 className="font-bold text-sm text-blue-600 uppercase tracking-wider mt-6">Image Tools</h4>
                    <ul className="space-y-2">
                      {imageTools.map(tool => (
                        <li key={tool.id}>
                          <Link href={`/${tool.id}`} className="block text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 p-1 rounded transition-colors">
                             {tool.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-yellow-600 uppercase tracking-wider">Convert to PDF</h4>
                    <ul className="space-y-2">
                      {convertToPdfTools.map(tool => (
                        <li key={tool.id}>
                          <Link href={`/${tool.id}`} className="block text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 p-1 rounded transition-colors">
                             {tool.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                     <h4 className="font-bold text-sm text-purple-600 uppercase tracking-wider">Convert from PDF</h4>
                    <ul className="space-y-2">
                      {convertFromPdfTools.map(tool => (
                        <li key={tool.id}>
                          <Link href={`/${tool.id}`} className="block text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 p-1 rounded transition-colors">
                             {tool.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <h4 className="font-bold text-sm text-slate-600 uppercase tracking-wider mt-6">Security</h4>
                    <ul className="space-y-2">
                      {securityTools.map(tool => (
                        <li key={tool.id}>
                          <Link href={`/${tool.id}`} className="block text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 p-1 rounded transition-colors">
                             {tool.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </nav>
  );
}
