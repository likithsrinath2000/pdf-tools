import { 
  FileInput, Scissors, Minimize2, FileText, FileType, Table, Image, 
  FileImage, Layers, Edit3, Trash, RotateCw, Lock, Unlock, 
  FileCheck, Globe, Stamp, PenTool, Crop, Shield, Eraser, Move
} from "lucide-react";

export const TOOLS = [
  // Organize
  {
    id: "merge-pdf",
    title: "Merge PDF",
    description: "Combine multiple PDF files into one organized document. Rearrange the order and merge with ease for a polished final file.",
    icon: FileInput,
    color: "bg-red-500",
    accept: ".pdf",
    action: "Merge PDF"
  },
  {
    id: "split-pdf",
    title: "Split PDF",
    description: "Separate one page or a whole set for easy conversion into independent PDF files.",
    icon: Scissors,
    color: "bg-red-500",
    accept: ".pdf",
    action: "Split PDF"
  },
  {
    id: "remove-pages",
    title: "Remove Pages",
    description: "Remove pages you no longer need from your PDF. Clean up your file by keeping only the most important content.",
    icon: Trash,
    color: "bg-red-500",
    accept: ".pdf",
    action: "Remove Pages"
  },
  {
    id: "extract-pages",
    title: "Extract Pages",
    description: "Select and extract specific pages from your PDF file. Create a new document from just the pages you need with no hassle.",
    icon: Layers,
    color: "bg-red-500",
    accept: ".pdf",
    action: "Extract Pages"
  },
  {
    id: "organize-pdf",
    title: "Organize PDF",
    description: "Easily rearrange pages in your PDF files with a simple drag-and-drop tool. Sort, rotate, or reorder pages to create perfectly structured documents in seconds.",
    icon: Layers,
    color: "bg-red-500",
    accept: ".pdf",
    action: "Organize PDF"
  },
  {
    id: "scan-pdf",
    title: "Scan to PDF",
    description: "Capture document scans from your mobile device and send them instantly to your browser.",
    icon: FileInput,
    color: "bg-red-500",
    accept: ".jpg,.png",
    action: "Scan to PDF"
  },

  // Optimize
  {
    id: "compress-pdf",
    title: "Compress PDF",
    description: "Reduce file size while optimizing for maximal PDF quality. Ideal for faster uploads, sharing, or saving space.",
    icon: Minimize2,
    color: "bg-green-500",
    accept: ".pdf",
    action: "Compress PDF"
  },
  {
    id: "repair-pdf",
    title: "Repair PDF",
    description: "Fix broken or corrupted PDF files quickly. Recover content, resolve loading errors, and restore access to damaged documents with just one click.",
    icon: FileCheck,
    color: "bg-green-500",
    accept: ".pdf",
    action: "Repair PDF"
  },
  {
    id: "optimize-web",
    title: "Optimize for Web",
    description: "Optimize PDF for web viewing with linearize PDF functionality.",
    icon: Globe,
    color: "bg-green-500",
    accept: ".pdf",
    action: "Optimize PDF"
  },

  // Convert to PDF
  {
    id: "jpg-to-pdf",
    title: "JPG to PDF",
    description: "Convert JPG images to PDF in seconds. Easily adjust orientation and margins.",
    icon: FileImage,
    color: "bg-yellow-500",
    accept: ".jpg,.jpeg",
    action: "Convert to PDF"
  },
  {
    id: "word-to-pdf",
    title: "Word to PDF",
    description: "Make DOC and DOCX files easy to read by converting them to PDF.",
    icon: FileType,
    color: "bg-blue-500",
    accept: ".doc,.docx",
    action: "Convert to PDF"
  },
  {
    id: "powerpoint-to-pdf",
    title: "PowerPoint to PDF",
    description: "Make PPT and PPTX slideshows easy to view by converting them to PDF.",
    icon: Table,
    color: "bg-orange-500",
    accept: ".ppt,.pptx",
    action: "Convert to PDF"
  },
  {
    id: "excel-to-pdf",
    title: "Excel to PDF",
    description: "Make EXCEL spreadsheets easy to read by converting them to PDF.",
    icon: Table,
    color: "bg-green-600",
    accept: ".xls,.xlsx",
    action: "Convert to PDF"
  },
  {
    id: "html-to-pdf",
    title: "HTML to PDF",
    description: "Convert web pages to PDF documents with high accuracy.",
    icon: Globe,
    color: "bg-blue-400",
    accept: ".html,.htm",
    action: "Convert to PDF"
  },

  // Convert from PDF
  {
    id: "pdf-to-jpg",
    title: "PDF to JPG",
    description: "Convert each PDF page into a JPG or extract all images contained in a PDF.",
    icon: Image,
    color: "bg-yellow-500",
    accept: ".pdf",
    action: "Convert to JPG"
  },
  {
    id: "pdf-to-word",
    title: "PDF to Word",
    description: "Easily convert your PDF files into easy to edit DOC and DOCX documents.",
    icon: FileText,
    color: "bg-blue-500",
    accept: ".pdf",
    action: "Convert to Word"
  },
  {
    id: "pdf-to-powerpoint",
    title: "PDF to PowerPoint",
    description: "Turn your PDF files into easy to edit PPT and PPTX slideshows.",
    icon: Table,
    color: "bg-orange-500",
    accept: ".pdf",
    action: "Convert to PowerPoint"
  },
  {
    id: "pdf-to-excel",
    title: "PDF to Excel",
    description: "Pull data straight from PDFs into EXCEL spreadsheets in a few short seconds.",
    icon: Table,
    color: "bg-green-600",
    accept: ".pdf",
    action: "Convert to Excel"
  },
  {
    id: "pdf-to-pdfa",
    title: "PDF to PDF/A",
    description: "Convert your PDF documents to PDF/A format for long-term archiving and preservation.",
    icon: FileType,
    color: "bg-red-700",
    accept: ".pdf",
    action: "Convert to PDF/A"
  },

  // Edit PDF
  {
    id: "rotate-pdf",
    title: "Rotate PDF",
    description: "Rotate your PDF pages. You can rotate only selected pages or all pages at once.",
    icon: RotateCw,
    color: "bg-purple-500",
    accept: ".pdf",
    action: "Rotate PDF"
  },
  {
    id: "add-page-numbers",
    title: "Add Page Numbers",
    description: "Add page numbers into your PDFs with ease. Choose your position, dimensions, typography.",
    icon: Edit3,
    color: "bg-purple-500",
    accept: ".pdf",
    action: "Add Numbers"
  },
  {
    id: "add-watermark",
    title: "Add Watermark",
    description: "Stamp an image or text over your PDF in seconds. Choose the typography, transparency and position.",
    icon: Stamp,
    color: "bg-purple-500",
    accept: ".pdf",
    action: "Add Watermark"
  },
  {
    id: "edit-pdf",
    title: "Edit PDF",
    description: "Add text, images, shapes or freehand annotations to a PDF document. Edit the size, font, and opacity of the added content.",
    icon: Edit3,
    color: "bg-purple-500",
    accept: ".pdf",
    action: "Edit PDF"
  },

  // PDF Security
  {
    id: "unlock-pdf",
    title: "Unlock PDF",
    description: "Remove PDF password security, giving you the freedom to use your PDFs as you want.",
    icon: Unlock,
    color: "bg-slate-700",
    accept: ".pdf",
    action: "Unlock PDF"
  },
  {
    id: "protect-pdf",
    title: "Protect PDF",
    description: "Protect PDF files with a password. Encrypt PDF documents to prevent unauthorized access.",
    icon: Lock,
    color: "bg-slate-700",
    accept: ".pdf",
    action: "Protect PDF"
  },
  {
    id: "sign-pdf",
    title: "Sign PDF",
    description: "Sign a document and request signatures. Draw your signature or sign PDF files with a certificate-based digital ID.",
    icon: PenTool,
    color: "bg-slate-700",
    accept: ".pdf",
    action: "Sign PDF"
  },

  // Image Tools (New Request)
  {
    id: "compress-image",
    title: "Compress Image",
    description: "Compress JPG, PNG, SVG or GIF with the best quality and compression. Reduce the filesize of your images at once.",
    icon: Minimize2,
    color: "bg-blue-600",
    accept: ".jpg,.jpeg,.png,.svg,.gif",
    action: "Compress Images"
  },
  {
    id: "crop-image",
    title: "Crop Image",
    description: "Crop JPG, PNG or GIFs with ease; Choose pixels to define your rectangle or use our visual editor.",
    icon: Crop,
    color: "bg-blue-600",
    accept: ".jpg,.jpeg,.png,.gif",
    action: "Crop Image"
  },
  {
    id: "convert-image",
    title: "Convert to JPG",
    description: "Convert PNG, GIF, TIF, PSD, SVG, WEBP or RAW to JPG format. Bulk convert images to JPG online.",
    icon: Image,
    color: "bg-blue-600",
    accept: ".png,.gif,.tif,.psd,.svg,.webp",
    action: "Convert to JPG"
  },
  {
    id: "resize-image",
    title: "Resize Image",
    description: "Resize JPG, PNG, SVG or GIF by defining new height and width pixels. Change image dimensions in bulk.",
    icon: Move,
    color: "bg-blue-600",
    accept: ".jpg,.jpeg,.png,.svg,.gif",
    action: "Resize Image"
  }
];
