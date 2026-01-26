import { memo } from "react";
import { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { addRecentTool } from "@/lib/preferences";

interface ToolCardProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  onToolClick?: (toolId: string) => void;
}

/**
 * ToolCard Component - Memoized for Performance
 * 
 * React.memo prevents unnecessary re-renders when parent components update
 * but the tool card props haven't changed. This is especially beneficial
 * on the home page where many tool cards are rendered in a grid.
 * 
 * Performance benefit: Avoids re-rendering all cards when unrelated state changes
 */
export const ToolCard = memo(function ToolCard({ id, title, description, icon: Icon, color, onToolClick }: ToolCardProps) {
  const handleClick = () => {
    addRecentTool(id);
    onToolClick?.(id);
  };

  return (
    <Link href={`/${id}`} onClick={handleClick}>
      <Card className="group h-full p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-border/50 bg-white">
        <div className="flex flex-col gap-4">
          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110", color)}>
            <Icon size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
});
