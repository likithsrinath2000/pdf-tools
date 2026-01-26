import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b z-50 px-4 md:px-8 flex items-center justify-between">
      <Link href="/">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white font-bold text-xl">
            P
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-foreground">
            PDF<span className="text-primary">Tools</span>
          </span>
        </div>
      </Link>
      
      <div className="hidden md:flex items-center gap-6">
        <Link href="/merge-pdf" className="text-sm font-medium hover:text-primary transition-colors">Merge PDF</Link>
        <Link href="/split-pdf" className="text-sm font-medium hover:text-primary transition-colors">Split PDF</Link>
        <Link href="/compress-pdf" className="text-sm font-medium hover:text-primary transition-colors">Compress PDF</Link>
        <Link href="/compress-image" className="text-sm font-medium hover:text-primary transition-colors">Compress Image</Link>
        <div className="h-4 w-px bg-border mx-2"></div>
        <Button variant="ghost" className="font-semibold">Log in</Button>
        <Button className="font-semibold shadow-lg shadow-primary/20">Sign up</Button>
      </div>
    </nav>
  );
}
