import { useState } from "react";
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
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { TOOLS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ChevronDown, Menu } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";

export function Navbar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Group tools for mega menu
  const organizeTools = TOOLS.filter(t => t.category === "organize");
  const optimizeTools = TOOLS.filter(t => t.category === "optimize");
  const convertToPdfTools = TOOLS.filter(t => t.category === "convert-to-pdf");
  const convertFromPdfTools = TOOLS.filter(t => t.category === "convert-from-pdf");
  const editTools = TOOLS.filter(t => t.category === "edit");
  const securityTools = TOOLS.filter(t => t.category === "security");
  const imageTools = TOOLS.filter(t => t.category === "image-tools");

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b z-50 px-4 md:px-8 flex items-center justify-between shadow-sm">
      <Link href="/" onClick={() => {
        // Force close logic if needed, usually Link change handles it but state reset is good
      }}>
        <div className="flex items-center gap-3 cursor-pointer group">
          <img 
            src="/src/assets/logo-humorous.png" 
            alt="Cool PDF Mascot" 
            className="w-10 h-10 object-contain group-hover:scale-110 transition-transform group-hover:rotate-12"
          />
          <span className="font-display font-bold text-2xl tracking-tight text-foreground group-hover:text-slate-800 transition-colors">
            PDF<span className="text-primary">Tools</span>
          </span>
        </div>
      </Link>
      
      {/* Desktop Menu - Centered */}
      <div className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent hover:bg-slate-100 font-semibold">
                PDF Tools
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[600px] lg:w-[800px] p-6 bg-white rounded-xl shadow-xl grid grid-cols-3 lg:grid-cols-4 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-red-600 uppercase tracking-wider">Organize PDF</h4>
                    <ul className="space-y-2">
                      {organizeTools.map(tool => (
                        <li key={tool.id}>
                          <NavigationMenuLink asChild>
                            <Link href={`/${tool.id}`} className="block text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 p-1 rounded transition-colors">
                               {tool.title}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-green-600 uppercase tracking-wider">Optimize</h4>
                    <ul className="space-y-2">
                      {optimizeTools.map(tool => (
                        <li key={tool.id}>
                          <NavigationMenuLink asChild>
                            <Link href={`/${tool.id}`} className="block text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 p-1 rounded transition-colors">
                               {tool.title}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-yellow-600 uppercase tracking-wider">Convert to PDF</h4>
                    <ul className="space-y-2">
                      {convertToPdfTools.map(tool => (
                        <li key={tool.id}>
                          <NavigationMenuLink asChild>
                            <Link href={`/${tool.id}`} className="block text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 p-1 rounded transition-colors">
                               {tool.title}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                    {/* Security moved here for better spacing on smaller screens if needed */}
                  </div>

                  <div className="space-y-4">
                     <h4 className="font-bold text-sm text-purple-600 uppercase tracking-wider">Convert from PDF</h4>
                    <ul className="space-y-2">
                      {convertFromPdfTools.map(tool => (
                        <li key={tool.id}>
                          <NavigationMenuLink asChild>
                            <Link href={`/${tool.id}`} className="block text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 p-1 rounded transition-colors">
                               {tool.title}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                    <h4 className="font-bold text-sm text-slate-600 uppercase tracking-wider mt-6">Security</h4>
                    <ul className="space-y-2">
                      {securityTools.map(tool => (
                        <li key={tool.id}>
                          <NavigationMenuLink asChild>
                            <Link href={`/${tool.id}`} className="block text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 p-1 rounded transition-colors">
                               {tool.title}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            
            <NavigationMenuItem>
               <NavigationMenuTrigger className="bg-transparent hover:bg-slate-100 font-semibold">
                Image Tools
               </NavigationMenuTrigger>
               <NavigationMenuContent>
                  <div className="w-[300px] p-6 bg-white rounded-xl shadow-xl">
                    <h4 className="font-bold text-sm text-blue-600 uppercase tracking-wider mb-4">Image Tools</h4>
                    <ul className="space-y-2">
                      {imageTools.map(tool => (
                        <li key={tool.id}>
                          <NavigationMenuLink asChild>
                            <Link href={`/${tool.id}`} className="block text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 p-1 rounded transition-colors">
                               {tool.title}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </div>
               </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Desktop Action Buttons - Right */}
      <div className="hidden lg:flex items-center gap-1">
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
        <div className="ml-2 border-l pl-2">
          <LanguageSelector />
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="lg:hidden flex items-center gap-2">
        <LanguageSelector />
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu size={24} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-left font-display text-2xl font-bold">Menu</SheetTitle>
            </SheetHeader>
            <div className="mt-8 flex flex-col gap-2">
              <Link href="/merge-pdf" onClick={closeMenu}>
                 <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className="font-medium text-slate-700">Merge PDF</span>
                 </div>
              </Link>
              <Link href="/split-pdf" onClick={closeMenu}>
                 <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className="font-medium text-slate-700">Split PDF</span>
                 </div>
              </Link>
              <Link href="/compress-pdf" onClick={closeMenu}>
                 <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className="font-medium text-slate-700">Compress PDF</span>
                 </div>
              </Link>
              <Link href="/compress-image" onClick={closeMenu}>
                 <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className="font-medium text-slate-700">Compress Image</span>
                 </div>
              </Link>

              <div className="my-4 border-t" />

              <h4 className="px-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">All Tools</h4>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="organize">
                  <AccordionTrigger className="px-3 hover:no-underline hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Organize PDF
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-2 pt-1">
                    <div className="flex flex-col gap-1 pl-4 border-l-2 ml-1">
                      {organizeTools.map(tool => (
                        <Link key={tool.id} href={`/${tool.id}`} onClick={closeMenu}>
                          <div className="py-2 text-slate-600 hover:text-primary cursor-pointer">
                            {tool.title}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="optimize">
                  <AccordionTrigger className="px-3 hover:no-underline hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Optimize
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-2 pt-1">
                    <div className="flex flex-col gap-1 pl-4 border-l-2 ml-1">
                      {optimizeTools.map(tool => (
                        <Link key={tool.id} href={`/${tool.id}`} onClick={closeMenu}>
                          <div className="py-2 text-slate-600 hover:text-primary cursor-pointer">
                            {tool.title}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="convert-to">
                  <AccordionTrigger className="px-3 hover:no-underline hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      Convert to PDF
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-2 pt-1">
                    <div className="flex flex-col gap-1 pl-4 border-l-2 ml-1">
                      {convertToPdfTools.map(tool => (
                        <Link key={tool.id} href={`/${tool.id}`} onClick={closeMenu}>
                          <div className="py-2 text-slate-600 hover:text-primary cursor-pointer">
                            {tool.title}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="convert-from">
                  <AccordionTrigger className="px-3 hover:no-underline hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      Convert from PDF
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-2 pt-1">
                    <div className="flex flex-col gap-1 pl-4 border-l-2 ml-1">
                      {convertFromPdfTools.map(tool => (
                        <Link key={tool.id} href={`/${tool.id}`} onClick={closeMenu}>
                          <div className="py-2 text-slate-600 hover:text-primary cursor-pointer">
                            {tool.title}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="security">
                  <AccordionTrigger className="px-3 hover:no-underline hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-700" />
                      Security
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-2 pt-1">
                    <div className="flex flex-col gap-1 pl-4 border-l-2 ml-1">
                      {securityTools.map(tool => (
                        <Link key={tool.id} href={`/${tool.id}`} onClick={closeMenu}>
                          <div className="py-2 text-slate-600 hover:text-primary cursor-pointer">
                            {tool.title}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="image">
                  <AccordionTrigger className="px-3 hover:no-underline hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                      Image Tools
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-2 pt-1">
                    <div className="flex flex-col gap-1 pl-4 border-l-2 ml-1">
                      {imageTools.map(tool => (
                        <Link key={tool.id} href={`/${tool.id}`} onClick={closeMenu}>
                          <div className="py-2 text-slate-600 hover:text-primary cursor-pointer">
                            {tool.title}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
