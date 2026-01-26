import { 
  FileInput, Scissors, Minimize2, FileText, FileType, Table, Image, 
  FileImage, Layers, Edit3, Trash, RotateCw, Lock, Unlock, 
  FileCheck, Globe, Stamp, PenTool, Crop, Shield, Eraser, Move,
  FileCode, FilePlus, FileSpreadsheet, Presentation
} from "lucide-react";

export interface Tool {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  accept: string;
  action: string;
  category: "organize" | "optimize" | "convert-to-pdf" | "convert-from-pdf" | "security" | "edit" | "image-tools";
  maxFiles?: number;
}

export const TOOLS: Tool[] = [
  // Organize
  {
    id: "merge-pdf",
    title: "Merge PDF",
    description: "Combine multiple PDF files into one organized document. Rearrange the order and merge with ease.",
    icon: FileInput,
    color: "bg-red-500",
    accept: ".pdf",
    action: "Merge PDF",
    category: "organize"
  },
  {
    id: "split-pdf",
    title: "Split PDF",
    description: "Separate one page or a whole set for easy conversion into independent PDF files.",
    icon: Scissors,
    color: "bg-red-500",
    accept: ".pdf",
    action: "Split PDF",
    category: "organize"
  },
  {
    id: "remove-pages",
    title: "Remove Pages",
    description: "Remove pages you no longer need from your PDF.",
    icon: Trash,
    color: "bg-red-500",
    accept: ".pdf",
    action: "Remove Pages",
    category: "organize"
  },
  {
    id: "extract-pages",
    title: "Extract Pages",
    description: "Select and extract specific pages from your PDF file.",
    icon: Layers,
    color: "bg-red-500",
    accept: ".pdf",
    action: "Extract Pages",
    category: "organize"
  },
  {
    id: "organize-pdf",
    title: "Organize PDF",
    description: "Sort, rotate, or reorder pages to create perfectly structured documents.",
    icon: Layers,
    color: "bg-red-500",
    accept: ".pdf",
    action: "Organize PDF",
    category: "organize"
  },
  {
    id: "scan-pdf",
    title: "Scan to PDF",
    description: "Capture document scans from your mobile device.",
    icon: FileInput,
    color: "bg-red-500",
    accept: ".jpg,.png",
    action: "Scan to PDF",
    category: "organize"
  },

  // Optimize
  {
    id: "compress-pdf",
    title: "Compress PDF",
    description: "Reduce file size while optimizing for maximal PDF quality.",
    icon: Minimize2,
    color: "bg-green-500",
    accept: ".pdf",
    action: "Compress PDF",
    category: "optimize",
    maxFiles: 1
  },
  {
    id: "repair-pdf",
    title: "Repair PDF",
    description: "Fix broken or corrupted PDF files quickly.",
    icon: FileCheck,
    color: "bg-green-500",
    accept: ".pdf",
    action: "Repair PDF",
    category: "optimize",
    maxFiles: 1
  },

  // Convert to PDF
  {
    id: "jpg-to-pdf",
    title: "JPG to PDF",
    description: "Convert JPG images to PDF in seconds.",
    icon: FileImage,
    color: "bg-yellow-500",
    accept: ".jpg,.jpeg",
    action: "Convert to PDF",
    category: "convert-to-pdf"
  },
  {
    id: "word-to-pdf",
    title: "Word to PDF",
    description: "Make DOC and DOCX files easy to read by converting them to PDF.",
    icon: FileType,
    color: "bg-blue-500",
    accept: ".doc,.docx",
    action: "Convert to PDF",
    category: "convert-to-pdf"
  },
  {
    id: "powerpoint-to-pdf",
    title: "PowerPoint to PDF",
    description: "Make PPT and PPTX slideshows easy to view by converting them to PDF.",
    icon: Table,
    color: "bg-orange-500",
    accept: ".ppt,.pptx",
    action: "Convert to PDF",
    category: "convert-to-pdf"
  },
  {
    id: "excel-to-pdf",
    title: "Excel to PDF",
    description: "Make EXCEL spreadsheets easy to read by converting them to PDF.",
    icon: Table,
    color: "bg-green-600",
    accept: ".xls,.xlsx",
    action: "Convert to PDF",
    category: "convert-to-pdf"
  },
  {
    id: "html-to-pdf",
    title: "HTML to PDF",
    description: "Convert web pages to PDF documents.",
    icon: Globe,
    color: "bg-blue-400",
    accept: ".html,.htm",
    action: "Convert to PDF",
    category: "convert-to-pdf"
  },

  // Convert from PDF
  {
    id: "pdf-to-jpg",
    title: "PDF to JPG",
    description: "Convert each PDF page into a JPG or extract all images.",
    icon: Image,
    color: "bg-yellow-500",
    accept: ".pdf",
    action: "Convert to JPG",
    category: "convert-from-pdf"
  },
  {
    id: "pdf-to-word",
    title: "PDF to Word",
    description: "Easily convert your PDF files into easy to edit DOC and DOCX documents.",
    icon: FileText,
    color: "bg-blue-500",
    accept: ".pdf",
    action: "Convert to Word",
    category: "convert-from-pdf"
  },
  {
    id: "pdf-to-powerpoint",
    title: "PDF to PowerPoint",
    description: "Turn your PDF files into easy to edit PPT and PPTX slideshows.",
    icon: Table,
    color: "bg-orange-500",
    accept: ".pdf",
    action: "Convert to PowerPoint",
    category: "convert-from-pdf"
  },
  {
    id: "pdf-to-excel",
    title: "PDF to Excel",
    description: "Pull data straight from PDFs into EXCEL spreadsheets.",
    icon: Table,
    color: "bg-green-600",
    accept: ".pdf",
    action: "Convert to Excel",
    category: "convert-from-pdf"
  },
  {
    id: "pdf-to-pdfa",
    title: "PDF to PDF/A",
    description: "Convert your PDF documents to PDF/A format for long-term archiving.",
    icon: FileType,
    color: "bg-red-700",
    accept: ".pdf",
    action: "Convert to PDF/A",
    category: "convert-from-pdf"
  },
  {
    id: "extract-images",
    title: "Extract Images",
    description: "Extract all embedded images from your PDF file. Like a treasure hunt, but with pixels!",
    icon: FileImage,
    color: "bg-purple-500",
    accept: ".pdf",
    action: "Extract Images",
    category: "convert-from-pdf"
  },
  {
    id: "pdf-to-text",
    title: "PDF to Text",
    description: "Extract all text from your PDF documents into a plain text file. No more copy-paste gymnastics!",
    icon: FileText,
    color: "bg-gray-600",
    accept: ".pdf",
    action: "Extract Text",
    category: "convert-from-pdf"
  },

  // Edit PDF
  {
    id: "rotate-pdf",
    title: "Rotate PDF",
    description: "Rotate your PDF pages.",
    icon: RotateCw,
    color: "bg-purple-500",
    accept: ".pdf",
    action: "Rotate PDF",
    category: "edit",
    maxFiles: 1
  },
  {
    id: "add-page-numbers",
    title: "Add Page Numbers",
    description: "Add page numbers into your PDFs with ease.",
    icon: Edit3,
    color: "bg-purple-500",
    accept: ".pdf",
    action: "Add Numbers",
    category: "edit",
    maxFiles: 1
  },
  {
    id: "add-watermark",
    title: "Add Watermark",
    description: "Stamp an image or text over your PDF.",
    icon: Stamp,
    color: "bg-purple-500",
    accept: ".pdf",
    action: "Add Watermark",
    category: "edit",
    maxFiles: 1
  },
  {
    id: "edit-pdf",
    title: "Edit PDF",
    description: "Add text, images, shapes or freehand annotations to a PDF.",
    icon: Edit3,
    color: "bg-purple-500",
    accept: ".pdf",
    action: "Edit PDF",
    category: "edit",
    maxFiles: 1
  },
  {
    id: "create-document",
    title: "Create Document",
    description: "Create beautiful documents with our full-featured editor. Tables, images, formatting - it's like a word processor but cooler!",
    icon: FilePlus,
    color: "bg-purple-500",
    accept: "",
    action: "Create PDF",
    category: "edit",
    maxFiles: 0
  },
  {
    id: "create-word",
    title: "Create Word Doc",
    description: "Create Word documents (.docx) from scratch. Type your content and download as a real Word file!",
    icon: FileText,
    color: "bg-blue-600",
    accept: "",
    action: "Create DOCX",
    category: "edit",
    maxFiles: 0
  },
  {
    id: "create-excel",
    title: "Create Excel",
    description: "Build spreadsheets (.xlsx) with rows and columns. Perfect for data, budgets, and lists!",
    icon: FileSpreadsheet,
    color: "bg-green-600",
    accept: "",
    action: "Create XLSX",
    category: "edit",
    maxFiles: 0
  },
  {
    id: "create-powerpoint",
    title: "Create PowerPoint",
    description: "Design presentations (.pptx) with slides. Add titles and content for each slide!",
    icon: Presentation,
    color: "bg-orange-500",
    accept: "",
    action: "Create PPTX",
    category: "edit",
    maxFiles: 0
  },

  // Security
  {
    id: "unlock-pdf",
    title: "Unlock PDF",
    description: "Remove PDF password security.",
    icon: Unlock,
    color: "bg-slate-700",
    accept: ".pdf",
    action: "Unlock PDF",
    category: "security",
    maxFiles: 1
  },
  {
    id: "protect-pdf",
    title: "Protect PDF",
    description: "Protect PDF files with a password.",
    icon: Lock,
    color: "bg-slate-700",
    accept: ".pdf",
    action: "Protect PDF",
    category: "security",
    maxFiles: 1
  },
  {
    id: "sign-pdf",
    title: "Sign PDF",
    description: "Sign a document and request signatures.",
    icon: PenTool,
    color: "bg-slate-700",
    accept: ".pdf",
    action: "Sign PDF",
    category: "security",
    maxFiles: 1
  },

  // Image Tools
  {
    id: "compress-image",
    title: "Compress Image",
    description: "Compress JPG, PNG, SVG or GIF with the best quality and compression.",
    icon: Minimize2,
    color: "bg-blue-600",
    accept: ".jpg,.jpeg,.png,.svg,.gif",
    action: "Compress Images",
    category: "image-tools"
  },
  {
    id: "crop-image",
    title: "Crop Image",
    description: "Crop JPG, PNG or GIFs with ease.",
    icon: Crop,
    color: "bg-blue-600",
    accept: ".jpg,.jpeg,.png,.gif",
    action: "Crop Image",
    category: "image-tools",
    maxFiles: 1
  },
  {
    id: "convert-image",
    title: "Convert to JPG",
    description: "Convert PNG, GIF, TIF, PSD, SVG, WEBP or RAW to JPG format.",
    icon: Image,
    color: "bg-blue-600",
    accept: ".png,.gif,.tif,.psd,.svg,.webp",
    action: "Convert to JPG",
    category: "image-tools",
    maxFiles: 1
  },
  {
    id: "resize-image",
    title: "Resize Image",
    description: "Resize JPG, PNG, SVG or GIF by defining new height and width pixels.",
    icon: Move,
    color: "bg-blue-600",
    accept: ".jpg,.jpeg,.png,.svg,.gif",
    action: "Resize Image",
    category: "image-tools",
    maxFiles: 1
  },
  {
    id: "rotate-image",
    title: "Rotate Image",
    description: "Rotate your images by 90, 180, or 270 degrees. For when your photos decide to be rebels.",
    icon: RotateCw,
    color: "bg-blue-600",
    accept: ".jpg,.jpeg,.png,.gif",
    action: "Rotate Image",
    category: "image-tools",
    maxFiles: 1
  }
];
