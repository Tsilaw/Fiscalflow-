import ExcelJS from "exceljs";
import { ParsedReceipt } from "./parser";

export async function generateExcel(receipts: ParsedReceipt[], filename: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FiscalFlow";
  workbook.created = new Date();

  // ===== Sheet 1: Transactions =====
  const txSheet = workbook.addWorksheet("Transactions", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  txSheet.columns = [
    { header: "Receipt #", key: "receiptNumber", width: 14 },
    { header: "Date", key: "date", width: 14 },
    { header: "Time", key: "time", width: 10 },
    { header: "Item/Description", key: "description", width: 32 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Unit Price", key: "unitPrice", width: 14 },
    { header: "Line Total", key: "lineTotal", width: 14 },
    { header: "Payment Method", key: "paymentMethod", width: 16 },
    { header: "Status", key: "status", width: 12 },
  ];

  // Style header row
  txSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  txSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2B2D31" },
  };

  for (const receipt of receipts) {
    if (receipt.items.length > 0) {
      for (const item of receipt.items) {
        txSheet.addRow({
          receiptNumber: receipt.receiptNumber,
          date: receipt.date,
          time: receipt.time,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          paymentMethod: receipt.paymentMethod,
          status: receipt.status,
        });
      }
    } else {
      txSheet.addRow({
        receiptNumber: receipt.receiptNumber,
        date: receipt.date,
        time: receipt.time,
        description: "(No items parsed)",
        quantity: 0,
        unitPrice: 0,
        lineTotal: receipt.total,
        paymentMethod: receipt.paymentMethod,
        status: receipt.status,
      });
    }
  }

  // Auto filter
  txSheet.autoFilter = {
    from: "A1",
    to: `I${txSheet.rowCount}`,
  };

  // ===== Sheet 2: Receipt Summary =====
  const sumSheet = workbook.addWorksheet("Receipt Summary", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sumSheet.columns = [
    { header: "Receipt #", key: "receiptNumber", width: 14 },
    { header: "Date", key: "date", width: 14 },
    { header: "Time", key: "time", width: 10 },
    { header: "Items", key: "itemCount", width: 8 },
    { header: "Subtotal", key: "subtotal", width: 14 },
    { header: "Tax", key: "tax", width: 12 },
    { header: "Discount", key: "discount", width: 12 },
    { header: "Grand Total", key: "total", width: 14 },
    { header: "Payment Method", key: "paymentMethod", width: 16 },
    { header: "Status", key: "status", width: 12 },
  ];

  sumSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sumSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0047AB" },
  };

  for (const receipt of receipts) {
    sumSheet.addRow({
      receiptNumber: receipt.receiptNumber,
      date: receipt.date,
      time: receipt.time,
      itemCount: receipt.items.length,
      subtotal: receipt.subtotal,
      tax: receipt.tax,
      discount: receipt.discount,
      total: receipt.total,
      paymentMethod: receipt.paymentMethod,
      status: receipt.status,
    });
  }

  sumSheet.autoFilter = {
    from: "A1",
    to: `J${sumSheet.rowCount}`,
  };

  // Format number columns
  const numCols = ["unitPrice", "lineTotal", "subtotal", "tax", "discount", "total"];
  [txSheet, sumSheet].forEach((sheet) => {
    sheet.columns.forEach((col) => {
      if (numCols.includes(col.key || "")) {
        col.numFmt = "#,##0.00";
      }
    });
  });

  // ===== Sheet 3: Processing Notes =====
  const notesSheet = workbook.addWorksheet("Processing Notes");
  notesSheet.columns = [
    { header: "Field", key: "field", width: 24 },
    { header: "Value", key: "value", width: 50 },
  ];
  notesSheet.getRow(1).font = { bold: true };

  notesSheet.addRow({ field: "Source File", value: filename });
  notesSheet.addRow({ field: "Processed At", value: new Date().toISOString() });
  notesSheet.addRow({ field: "Total Receipts", value: receipts.length });
  notesSheet.addRow({ field: "Valid Receipts", value: receipts.filter((r) => r.status === "valid").length });
  notesSheet.addRow({ field: "Voided Receipts", value: receipts.filter((r) => r.status === "voided").length });
  notesSheet.addRow({ field: "Needs Review", value: receipts.filter((r) => r.status === "review").length });
  notesSheet.addRow({ field: "Parser Version", value: "1.0.0" });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
