import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Zap, Heart, Users, Shield, Rocket, Coffee } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold font-display text-slate-900">
              About <span className="text-primary">PDFTools</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Because life is too short to fight with printers, wrestle with file formats, or cry over corrupted documents.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border p-12 space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Rocket className="text-primary" size={32} />
                Our Mission
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We believe that working with documents should be as smooth as butter on warm toast. 
                PDFTools was born out of frustration with clunky, expensive, and overly complicated 
                document tools that make you feel like you need a PhD just to merge two files.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our mission is simple: provide powerful, lightning-fast document processing tools 
                that actually work the way you expect them to. No tricks, no hidden fees, 
                no "premium features" that should have been free in the first place.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 pt-8 border-t">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Zap className="text-blue-600" size={24} />
                  </div>
                  <h3 className="text-xl font-bold">Lightning Fast</h3>
                </div>
                <p className="text-muted-foreground">
                  We process your files faster than you can say "why is this taking so long?" 
                  Our servers are caffeinated and ready to go.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Shield className="text-green-600" size={24} />
                  </div>
                  <h3 className="text-xl font-bold">Secure & Private</h3>
                </div>
                <p className="text-muted-foreground">
                  Your files are your business. We process them and forget they ever existed. 
                  It's like Vegas, but for documents.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Heart className="text-purple-600" size={24} />
                  </div>
                  <h3 className="text-xl font-bold">Made with Love</h3>
                </div>
                <p className="text-muted-foreground">
                  Every pixel, every feature, every error message (yes, even those) 
                  was crafted by humans who genuinely care about your document woes.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Users className="text-orange-600" size={24} />
                  </div>
                  <h3 className="text-xl font-bold">For Everyone</h3>
                </div>
                <p className="text-muted-foreground">
                  Whether you're a student, professional, or just someone who accidentally 
                  created 47 versions of the same file, we've got you covered.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-3xl shadow-xl border p-12 space-y-6">
            <div className="flex items-center gap-3">
              <Coffee className="text-primary" size={40} />
              <h2 className="text-3xl font-bold">The Story</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              It started with a simple question: "Why does merging two PDFs require a credit card and my firstborn child?" 
              After our founder spent three hours trying to combine presentation slides on a Sunday night 
              (with a deadline at 8 AM Monday), PDFTools was born.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We're a small team of developers, designers, and document enthusiasts who believe that 
              great tools shouldn't cost an arm and a leg or require a computer science degree to use. 
              We built PDFTools to be the tool we wished existed when we needed it most.
            </p>
          </div>

          <div className="text-center space-y-6 pt-8">
            <h2 className="text-3xl font-bold">Our Promise</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="font-bold mb-2">Always Fast</h3>
                <p className="text-sm text-muted-foreground">
                  Your time is precious. We won't waste it.
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="font-bold mb-2">Always Secure</h3>
                <p className="text-sm text-muted-foreground">
                  Your files are deleted after processing. Promise.
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border">
                <div className="text-4xl mb-3">💯</div>
                <h3 className="font-bold mb-2">Always Improving</h3>
                <p className="text-sm text-muted-foreground">
                  We're constantly adding features based on your feedback.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
