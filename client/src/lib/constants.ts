import { 
  FileInput, 
  Scissors, 
  Minimize2, 
  FileText, 
  FileType, 
  Table, 
  Image, 
  FileImage 
} from "lucide-react";

export const TOOLS = [
  {
    id: "merge-pdf",
    title: "Merge PDF",
    description: "Combine PDFs in the order you want with the easiest PDF merger available.",
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
    id: "compress-pdf",
    title: "Compress PDF",
    description: "Reduce file size while optimizing for maximal PDF quality.",
    icon: Minimize2,
    color: "bg-green-500",
    accept: ".pdf",
    action: "Compress PDF"
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
    id: "word-to-pdf",
    title: "Word to PDF",
    description: "Make DOC and DOCX files easy to read by converting them to PDF.",
    icon: FileType,
    color: "bg-blue-500",
    accept: ".doc,.docx",
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
    id: "pdf-to-jpg",
    title: "PDF to JPG",
    description: "Convert each PDF page into a JPG or extract all images contained in a PDF.",
    icon: Image,
    color: "bg-yellow-500",
    accept: ".pdf",
    action: "Convert to JPG"
  },
  {
    id: "jpg-to-pdf",
    title: "JPG to PDF",
    description: "Convert JPG images to PDF in seconds. Easily adjust orientation and margins.",
    icon: FileImage,
    color: "bg-yellow-500",
    accept: ".jpg,.jpeg,.png",
    action: "Convert to PDF"
  }
];
