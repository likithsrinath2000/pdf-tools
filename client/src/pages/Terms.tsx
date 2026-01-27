import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FileText, AlertTriangle, CheckCircle } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText className="text-primary" size={32} />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold font-display text-slate-900">
              Terms of Service
            </h1>
            <p className="text-lg text-muted-foreground">
              Last updated: January 2026
            </p>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The boring legal stuff, but we promise to keep it readable (and occasionally entertaining).
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border p-8 md:p-12 space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By using PDFTools, you agree to these terms. If you don't agree, that's totally fine — 
                there are plenty of other PDF tools out there (though we think ours is pretty great).
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">2. Use of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                You can use PDFTools for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Processing legitimate documents (yours or ones you have permission to modify)</li>
                <li>Personal, educational, or commercial purposes</li>
                <li>Making your document life easier</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Please don't use PDFTools for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Processing documents you don't have the right to modify</li>
                <li>Uploading malware, viruses, or other malicious content</li>
                <li>Attempting to hack, break, or otherwise mess with our systems</li>
                <li>Processing illegal content (we're serious about this one)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-amber-600" size={28} />
                <h2 className="text-2xl font-bold">3. Service Limitations</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We try our best to keep PDFTools running 24/7, but sometimes things happen:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Servers need maintenance (we'll try to schedule this during off-peak hours)</li>
                <li>Unexpected issues occur (computers are complicated)</li>
                <li>Acts of God, natural disasters, or zombie apocalypses interfere with service</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We're not liable for any downtime, data loss, or missed deadlines that result from using 
                our service. Always keep backups of important files (seriously, do this).
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">4. File Processing & Storage</h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong>File Size Limits:</strong> We allow files up to 100MB per upload. 
                If you need to process larger files, consider splitting them first.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong>File Retention:</strong> As stated in our Privacy Policy, we delete your files quickly:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Uploaded files: Deleted within 1 hour</li>
                <li>Processed files: Deleted after 24 hours</li>
                <li>Don't rely on PDFTools as a storage solution!</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">5. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                You own your files. We own our code and design. Simple as that.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                When you upload files to PDFTools, you retain all rights to your content. 
                We just borrow them temporarily to do the processing you asked for.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">6. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                PDFTools is provided "as is" without warranties of any kind. We work hard to make it reliable, 
                but we can't guarantee:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>100% uptime (nothing has 100% uptime, anyone who claims otherwise is lying)</li>
                <li>Perfect results every time (we're good, but not perfect)</li>
                <li>Compatibility with every single edge case imaginable</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">7. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                We're not responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Lost files (always keep backups!)</li>
                <li>Corrupted outputs (though we do our best to prevent this)</li>
                <li>Missed deadlines or business losses</li>
                <li>Your boss being angry because you waited until the last minute</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Use PDFTools responsibly and always have a backup plan for important work.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600" size={28} />
                <h2 className="text-2xl font-bold">8. Fair Use</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We believe in fair use for everyone. However, if you're:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Abusing the service (thousands of requests per minute)</li>
                <li>Attempting to overwhelm our servers</li>
                <li>Using automated bots without permission</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We reserve the right to limit or suspend your access. Play nice, and we'll play nice too.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">9. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these terms occasionally. When we do, we'll update the date at the top 
                and notify users of significant changes. Continued use of the service means you accept the new terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">10. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These terms are governed by common sense and applicable laws. If there's a dispute, 
                let's talk it out like adults before involving lawyers.
              </p>
            </section>

            <section className="space-y-4 pt-6 border-t">
              <h2 className="text-2xl font-bold">Questions or Concerns?</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about these terms or want to report a problem, 
                reach out to us. We're here to help.
              </p>
              <p className="text-lg font-medium text-primary">
                  waltwhite929@gmail.com
              </p>
            </section>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <p className="text-sm text-muted-foreground italic">
                Remember: These are legal terms written in plain English. While we've done our best to be 
                clear and friendly, if there's ever a legal dispute, a court will interpret these terms 
                using standard legal principles. But honestly, we hope it never comes to that. 
                Let's just make great documents together. 🙂
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
