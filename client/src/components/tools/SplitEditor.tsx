import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SplitEditorProps {
  files: File[];
}

export function SplitEditor({ files }: SplitEditorProps) {
  const [rangeType, setRangeType] = useState("custom");

  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl p-6 border shadow-sm">
      <div className="mb-6 flex items-center justify-center">
         <div className="bg-slate-100 px-4 py-2 rounded-lg text-sm font-medium text-slate-600">
            Selected File: <span className="text-slate-900">{files[0]?.name}</span>
         </div>
      </div>

      <Tabs defaultValue="ranges" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="ranges">Split by Range</TabsTrigger>
          <TabsTrigger value="fixed">Extract Pages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ranges" className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Range Mode</h3>
            <RadioGroup defaultValue="custom" onValueChange={setRangeType} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <RadioGroupItem value="custom" id="custom" className="peer sr-only" />
                <Label
                  htmlFor="custom"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="mb-2 block font-semibold">Custom Ranges</span>
                  <span className="text-xs text-center text-muted-foreground">
                    Define specific ranges (e.g., 1-5, 8, 11-13)
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="fixed" id="fixed" className="peer sr-only" />
                <Label
                  htmlFor="fixed"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="mb-2 block font-semibold">Fixed Ranges</span>
                  <span className="text-xs text-center text-muted-foreground">
                    Split into fixed batches (e.g., every 5 pages)
                  </span>
                </Label>
              </div>
            </RadioGroup>

            {rangeType === "custom" && (
              <div className="pt-4">
                 <Label>Page Ranges</Label>
                 <Input placeholder="e.g. 1-5, 8, 11-13" className="mt-2 text-lg h-12" />
                 <p className="text-xs text-muted-foreground mt-2">
                   This will create one PDF file for each range specified.
                 </p>
              </div>
            )}

            {rangeType === "fixed" && (
              <div className="pt-4">
                 <Label>Split every X pages</Label>
                 <Input type="number" placeholder="1" className="mt-2 text-lg h-12" min={1} />
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="fixed">
          <div className="text-center py-8 text-muted-foreground">
            Select specific pages to extract them into a new PDF file.
            <div className="mt-4 p-4 border rounded bg-slate-50">
               Page Selection Preview Mockup
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
