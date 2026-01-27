import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, Search, Coffee, FileQuestion } from "lucide-react";

const funnyMessages = [
  "Looks like this page went on vacation without telling anyone.",
  "This page is playing hide and seek... and winning.",
  "Houston, we have a problem. This page is lost in space.",
  "Plot twist: The page you're looking for doesn't exist.",
  "Error 404: Page not found. But hey, at least we found each other!",
  "This page took a wrong turn at Albuquerque.",
  "The page you're looking for is in another castle.",
  "Oops! This page got eaten by a PDF-hungry monster.",
  "This page is on a coffee break. Indefinitely.",
  "404: Page has left the building. Elvis style.",
];

const funnySubtexts = [
  "Maybe it got converted to a different format?",
  "Perhaps it was merged into oblivion?",
  "It might have been compressed too much and vanished.",
  "Someone probably rotated it into another dimension.",
  "The watermark covered everything, including the page itself.",
];

export default function NotFound() {
  const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
  const randomSubtext = funnySubtexts[Math.floor(Math.random() * funnySubtexts.length)];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg mx-4 shadow-xl border-2 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <FileQuestion className="h-24 w-24 animate-bounce" />
              <span className="absolute -top-2 -right-2 text-4xl">?</span>
            </div>
          </div>
          <h1 className="text-6xl font-bold mb-2">404</h1>
          <p className="text-xl font-medium opacity-90">Page Not Found</p>
        </div>
        
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="space-y-3">
            <p className="text-lg font-medium text-gray-800">
              {randomMessage}
            </p>
            <p className="text-sm text-gray-500 italic">
              {randomSubtext}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Coffee className="h-4 w-4" />
            <span>Time to grab a coffee and try again?</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link href="/">
              <Button className="gap-2 w-full sm:w-auto" data-testid="button-go-home">
                <Home className="h-4 w-4" />
                Back to Safety
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="gap-2 w-full sm:w-auto" data-testid="button-browse-tools">
                <Search className="h-4 w-4" />
                Browse Tools
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-400 pt-4">
            Pro tip: The home page definitely exists. We checked. Twice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
