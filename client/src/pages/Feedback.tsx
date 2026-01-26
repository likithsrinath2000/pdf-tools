import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Feedback() {
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-2xl mx-auto space-y-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="text-primary" size={32} />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold font-display text-slate-900">
              Feedback
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">
              We love hearing from you! Whether it's a bug, a feature request, or just a friendly hello - we're all ears.
            </p>
          </div>

          {submitted ? (
            <div className="bg-white rounded-3xl shadow-xl border p-12 text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold">Thanks for your feedback!</h2>
              <p className="text-muted-foreground">
                We appreciate you taking the time to share your thoughts. 
                If you left your email, we might reach out (but no promises - we're pretty busy making PDFs happy).
              </p>
              <Button onClick={() => setSubmitted(false)} variant="outline">
                Send More Feedback
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl border p-8 md:p-12">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    Only if you want us to reply. We promise not to spam you.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">Your Feedback</Label>
                  <Textarea 
                    id="feedback"
                    placeholder="Tell us what's on your mind... Did we merge when we should have split? Is the compression too aggressive? Do you just want to say hi? We're here for it all."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[200px] resize-none"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-14 text-lg rounded-xl"
                  disabled={!feedback.trim()}
                >
                  <Send className="mr-2 h-5 w-5" />
                  Send Feedback
                </Button>
              </form>

              <div className="mt-8 pt-8 border-t text-center">
                <p className="text-sm text-muted-foreground">
                  Found a critical bug? You can also email us directly at{" "}
                  <span className="text-primary font-medium">bugs@pdftools.example.com</span>
                </p>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-2xl p-8 text-center space-y-4">
            <h3 className="text-xl font-bold">What kind of feedback helps most?</h3>
            <ul className="text-muted-foreground space-y-2 text-left max-w-md mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>Bugs: "When I do X, Y happens instead of Z"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>Feature requests: "I wish I could do..."</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Praise: "You're amazing and here's why" (we love these)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>Jokes: We appreciate a good PDF pun</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
