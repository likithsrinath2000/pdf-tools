import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Shield, Eye, Trash2, Lock } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Shield className="text-primary" size={32} />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold font-display text-slate-900">
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              Last updated: January 2026
            </p>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              TL;DR: We don't sell your data, we don't snoop through your files, 
              and we delete everything after processing. Simple as that.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border p-8 md:p-12 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <Eye className="text-primary" size={28} />
                <h2 className="text-2xl font-bold">What We Collect</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                When you use PDFTools, we temporarily store:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>The files you upload (but only long enough to process them)</li>
                <li>Basic usage data (what tools you used, when you used them)</li>
                <li>Technical information (your IP address, browser type) for security purposes</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                That's it. No email addresses required, no accounts to create, no lengthy forms to fill out.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <Trash2 className="text-green-600" size={28} />
                <h2 className="text-2xl font-bold">What We Delete</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Here's the fun part: We delete <strong>everything</strong>.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Your uploaded files are deleted within 1 hour of processing</li>
                <li>Your processed files are deleted after 24 hours (or sooner if you manually delete them)</li>
                <li>All job metadata is purged after 7 days</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                We're not interested in keeping your vacation photos, tax returns, or poorly formatted résumés. 
                Once we've done our job, we forget you existed (in the nicest way possible).
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <Lock className="text-purple-600" size={28} />
                <h2 className="text-2xl font-bold">How We Protect Your Data</h2>
              </div>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>All file transfers use HTTPS encryption (fancy speak for "we lock everything up tight")</li>
                <li>Files are stored on secure servers that only our systems can access</li>
                <li>We use industry-standard security practices to protect against unauthorized access</li>
                <li>Our staff doesn't peek at your files (we have better things to do, trust us)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Cookies & Tracking</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use minimal cookies to keep the site working properly. No advertising cookies, 
                no tracking pixels, no creepy "we see you on other websites" nonsense.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Third Parties</h2>
              <p className="text-muted-foreground leading-relaxed">
                We don't share your data with third parties. Not for advertising, not for analytics, 
                not for "business partnerships." Your documents are between you and PDFTools, period.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Know what data we have (spoiler: very little)</li>
                <li>Request deletion of your data (though it's probably already gone)</li>
                <li>Ask questions about our privacy practices (we love questions!)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                If we update this policy, we'll update the date at the top and make a note of what changed. 
                We won't make sneaky changes hoping you don't notice.
              </p>
            </section>

            <section className="space-y-4 pt-6 border-t">
              <h2 className="text-2xl font-bold">Questions?</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about how we handle your data, feel free to reach out. 
                We're real people and we actually respond to emails.
              </p>
              <p className="text-lg font-medium text-primary">
                privacy@pdftools.example.com
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
