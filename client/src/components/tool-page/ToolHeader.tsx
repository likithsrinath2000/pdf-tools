import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Props for the ToolHeader component
 */
interface ToolHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

/**
 * ToolHeader component displays the tool's icon, title, and description
 * at the top of the tool page. Uses React.memo for performance optimization
 * since this content rarely changes during the tool's lifecycle.
 */
const ToolHeader = React.memo(function ToolHeader({ 
  icon: Icon, 
  title, 
  description, 
  color 
}: ToolHeaderProps) {
  return (
    <div className="text-center max-w-2xl mb-12 space-y-4">
      {/* Tool icon with colored background */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", 
          color
        )}>
          <Icon size={28} />
        </div>
      </div>
      
      {/* Tool title */}
      <h1 className="text-4xl md:text-5xl font-bold font-display text-slate-900">
        {title}
      </h1>
      
      {/* Tool description */}
      <p className="text-xl text-muted-foreground">
        {description}
      </p>
    </div>
  );
});

export { ToolHeader };
export type { ToolHeaderProps };
