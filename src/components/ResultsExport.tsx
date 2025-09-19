import React from "react";
import { downloadCSV } from "../lib/tools/exporters";

type Row = Record<string, string | number>;

type Props = {
  headers: string[];
  rows: Row[];
  filename: string;
};

export default function ResultsExport({ headers, rows, filename }: Props) {
  function handleExport() {
    if (!rows.length) return;
    const data: (string | number)[][] = [headers];
    rows.forEach((row) => {
      data.push(headers.map((key) => (key in row ? String(row[key]) : "")));
    });
    downloadCSV(data, filename);
  }

  return (
    <div style={{ marginTop: "12px" }}>
      <button
        type="button"
        className="btn"
        id="btn-export-csv"
        onClick={handleExport}
        disabled={!rows.length}
      >
        导出 CSV
      </button>
    </div>
  );
}
