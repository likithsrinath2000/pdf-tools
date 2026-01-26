export function Footer() {
  return (
    <footer className="bg-slate-50 border-t py-12 px-4 md:px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center text-white font-bold text-xs">P</div>
             <span className="font-display font-bold text-xl">PDFTools</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your all-in-one solution for PDF modification and conversion. Fast, secure, and easy to use.
          </p>
        </div>
        
        <div>
          <h4 className="font-bold mb-4">Solutions</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary">Business</a></li>
            <li><a href="#" className="hover:text-primary">Education</a></li>
            <li><a href="#" className="hover:text-primary">Developers</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary">About</a></li>
            <li><a href="#" className="hover:text-primary">Legal</a></li>
            <li><a href="#" className="hover:text-primary">Help</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold mb-4">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary">Pricing</a></li>
            <li><a href="#" className="hover:text-primary">Teams</a></li>
            <li><a href="#" className="hover:text-primary">Security</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
        © 2026 PDFTools. All rights reserved.
      </div>
    </footer>
  );
}
