import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MessageSquare, Mail, Clock, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeedbackEntry {
  id: string;
  feedback: string;
  email: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback");
      if (!response.ok) throw new Error("Failed to fetch feedback");
      const data = await response.json();
      setFeedbacks(data.feedbacks);
    } catch (err) {
      setError("Failed to load feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <MessageSquare className="text-purple-600" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Feedback Dashboard</h1>
                <p className="text-muted-foreground">All user feedback submissions</p>
              </div>
            </div>
            <Button onClick={fetchFeedback} variant="outline" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
              {error}
            </div>
          )}

          {loading && feedbacks.length === 0 ? (
            <div className="text-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Loading feedback...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No feedback yet. Check back later!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{feedbacks.length} feedback entries</p>
              
              {feedbacks.map((entry) => (
                <div key={entry.id} className="bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <p className="text-slate-800 whitespace-pre-wrap">{entry.feedback}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {entry.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            <span>{entry.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(entry.createdAt)}</span>
                        </div>
                        {entry.ipAddress && (
                          <div className="flex items-center gap-1">
                            <Globe className="h-4 w-4" />
                            <span>{entry.ipAddress}</span>
                          </div>
                        )}
                      </div>
                      
                      {entry.userAgent && (
                        <p className="text-xs text-muted-foreground/70 truncate max-w-2xl" title={entry.userAgent}>
                          {entry.userAgent}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
