export function Footer() {
  return (
    <footer className="bg-slate-50 border-t py-12 px-4 md:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4">
          <div className="flex items-center gap-3">
             <img 
               src="/src/assets/logo-humorous.png" 
               alt="Cool PDF Mascot" 
               className="w-8 h-8 object-contain hover:rotate-12 transition-transform"
             />
             <span className="font-display font-bold text-xl">PDFTools</span>
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-left max-w-md">
            Made with love, too much coffee, and a deep hatred for printer drivers.
            <br/>
            Your documents are safe with us (we promise we're not reading your secret recipes).
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-8 text-center md:text-left">
           <div>
             <h4 className="font-bold mb-4">The Serious Stuff</h4>
             <ul className="space-y-2 text-sm text-muted-foreground">
               <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Feedback</a></li>
             </ul>
           </div>
           
           <div>
             <h4 className="font-bold mb-4">The Fun Stuff</h4>
             <ul className="space-y-2 text-sm text-muted-foreground">
               <li><a href="#" className="hover:text-primary transition-colors">How to survive Mondays</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Coffee Donations</a></li>
             </ul>
           </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
        © 2026 PDFTools. No PDFs were harmed in the making of this website.
      </div>
    </footer>
  );
}
