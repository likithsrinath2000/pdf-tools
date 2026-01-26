import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Table } from "lucide-react";

interface ExcelEditorProps {
  onDataChange: (data: { headers: string[], rows: string[][] }) => void;
}

export function ExcelEditor({ onDataChange }: ExcelEditorProps) {
  const [headers, setHeaders] = useState<string[]>(["Column A", "Column B", "Column C"]);
  const [rows, setRows] = useState<string[][]>([
    ["", "", ""],
    ["", "", ""],
    ["", "", ""]
  ]);

  useEffect(() => {
    onDataChange({ headers, rows });
  }, [headers, rows, onDataChange]);

  const addColumn = () => {
    const colName = `Column ${String.fromCharCode(65 + headers.length)}`;
    setHeaders([...headers, colName]);
    setRows(rows.map(row => [...row, ""]));
  };

  const removeColumn = () => {
    if (headers.length > 1) {
      setHeaders(headers.slice(0, -1));
      setRows(rows.map(row => row.slice(0, -1)));
    }
  };

  const addRow = () => {
    setRows([...rows, new Array(headers.length).fill("")]);
  };

  const removeRow = () => {
    if (rows.length > 1) {
      setRows(rows.slice(0, -1));
    }
  };

  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = rows.map((row, rIdx) => 
      rIdx === rowIndex 
        ? row.map((cell, cIdx) => cIdx === colIndex ? value : cell)
        : row
    );
    setRows(newRows);
  };

  return (
    <div className="w-full max-w-5xl space-y-4">
      <div className="bg-green-50 p-4 rounded-xl border border-green-200 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Table className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-green-900">Create Excel Spreadsheet</h3>
        </div>
        <p className="text-sm text-green-700">
          Build your spreadsheet below. Add headers, fill in data, and click "Create XLSX" to download your Excel file!
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={addColumn}>
          <Plus size={14} className="mr-1" /> Add Column
        </Button>
        <Button variant="outline" size="sm" onClick={removeColumn} disabled={headers.length <= 1}>
          <Minus size={14} className="mr-1" /> Remove Column
        </Button>
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus size={14} className="mr-1" /> Add Row
        </Button>
        <Button variant="outline" size="sm" onClick={removeRow} disabled={rows.length <= 1}>
          <Minus size={14} className="mr-1" /> Remove Row
        </Button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-green-100">
              {headers.map((header, idx) => (
                <th key={idx} className="border border-green-200 p-0">
                  <Input
                    value={header}
                    onChange={(e) => updateHeader(idx, e.target.value)}
                    className="border-0 rounded-none font-bold text-center bg-transparent h-10"
                    placeholder={`Column ${idx + 1}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="border border-slate-200 p-0">
                    <Input
                      value={cell}
                      onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                      className="border-0 rounded-none h-9"
                      placeholder="..."
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Enter your data above. Headers are in the green row. Click a cell to edit it.
      </p>
    </div>
  );
}
