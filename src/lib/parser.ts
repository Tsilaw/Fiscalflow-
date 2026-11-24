/**
 * FiscalFlow Enterprise POS Journal TXT Parser
 *
 * Accurate multi-format parser for Ethiopian Fiscal Printers (Datecs, Daisy, BMC, Aclas, Telpo)
 * and generic electronic POS journals.
 * Deduplicates multiple receipt copies from dual-roll journals and filters out daily Z-reports.
 */

export interface ParsedItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ParsedReceipt {
  receiptNumber: string;
  date: string;
  time: string;
  items: ParsedItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: "valid" | "voided" | "review";
  rawText: string;
}

export interface ScanResult {
  format: string;
  totalReceipts: number;
  parsedReceipts: number;
  reviewCount: number;
  receipts: ParsedReceipt[];
  warnings: string[];
}

function parseNumber(str: string): number {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, "").trim()) || 0;
}

/**
 * Strips machine line-counter prefixes (e.g., "000064\tN\t" or "000123 ")
 */
function cleanLine(line: string): string {
  return line.replace(/^[0-9]{5,7}\t[A-Za-z0-9]\t/, "").replace(/^[0-9]{6}\s+/, "").trim();
}

/**
 * Parses a single authentic Ethiopian Fiscal Receipt block
 */
function parseEthiopianReceipt(rawBlock: string, fallbackIndex: number): ParsedReceipt {
  const lines = rawBlock.split(/\r?\n/).map(cleanLine);
  const rawCleaned = lines.join("\n");

  // 1. FS Receipt Number (e.g. FS No.00001845)
  let receiptNumber = String(fallbackIndex + 1).padStart(4, "0");
  const fsMatch = rawCleaned.match(/(?<!ACCU\.)(?<!SESSION\.)FS\s*No\.?\s*([0-9]+)/i) ||
                  rawCleaned.match(/FS\s*#?\s*([0-9]+)/i);
  if (fsMatch) {
    receiptNumber = fsMatch[1];
  }

  // 2. Date and Time (e.g. "04/05/2021 17:33")
  let date = "";
  let time = "";
  const dateTimeMatch = rawCleaned.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)/);
  if (dateTimeMatch) {
    date = dateTimeMatch[1];
    time = dateTimeMatch[2];
  } else {
    const dMatch = rawCleaned.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
    if (dMatch) date = dMatch[1];
    const tMatch = rawCleaned.match(/(\d{2}:\d{2}(?::\d{2})?)/);
    if (tMatch) time = tMatch[1];
  }

  // 3. Line Items
  // Ethiopian fiscal cash registers commonly write items on 2 lines:
  // Line 1: "1.000 x 22,608.700 ="
  // Line 2: "desk top computer core  i *22,608.70"
  // Or standard single line: "item name  qty x price  total"
  const items: ParsedItem[] = [];
  let pendingQty: number | null = null;
  let pendingUnit: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Pattern A: Qty x Unit =
    const qm = line.match(/^([0-9]+(?:\.[0-9]+)?)\s*[xX*×]\s*([0-9,]+(?:\.[0-9]+)?)\s*=/);
    if (qm) {
      pendingQty = parseNumber(qm[1]);
      pendingUnit = parseNumber(qm[2]);
      continue;
    }

    if (pendingQty !== null && pendingUnit !== null) {
      // Check if next line contains description and total (e.g. "desk top computer core  i *22,608.70")
      const descMatch = line.match(/^(.*?)\s*\*?([0-9,]+\.[0-9]{2})$/);
      if (descMatch && !/TXBL|TOTAL|TAX|CASH|HEE|Buyer|Prepared|Reference|SESSION|ACCU/i.test(descMatch[1])) {
        items.push({
          description: descMatch[1].trim(),
          quantity: pendingQty,
          unitPrice: pendingUnit,
          lineTotal: parseNumber(descMatch[2]),
        });
      }
      pendingQty = null;
      pendingUnit = null;
      continue;
    }

    // Pattern B: Single line "Coca-Cola   2 x 25.00   50.00"
    const singleMatch = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/);
    if (singleMatch && !/TXBL|TOTAL|TAX|CASH/i.test(singleMatch[1])) {
      items.push({
        description: singleMatch[1].trim(),
        quantity: parseNumber(singleMatch[2]),
        unitPrice: parseNumber(singleMatch[3]),
        lineTotal: parseNumber(singleMatch[4]),
      });
      continue;
    }
  }

  // 4. Financial Totals
  let subtotal = 0;
  let tax = 0;
  let discount = 0;
  let total = 0;

  const txblMatch = rawCleaned.match(/(?:TXBL\s*1?|SUBTOTAL|SUB\s*-?\s*TOTAL)\s*\*?([0-9,]+\.[0-9]{2})/i);
  if (txblMatch) subtotal = parseNumber(txblMatch[1]);

  const taxMatch = rawCleaned.match(/(?:TAX\s*1?\s*15%?|VAT\s*15%?|TAX\s*TL)\s*\*?([0-9,]+\.[0-9]{2})/i);
  if (taxMatch) tax = parseNumber(taxMatch[1]);

  const discMatch = rawCleaned.match(/(?:DISCOUNT)\s*:?\s*-?\s*\*?([0-9,]+\.[0-9]{2})/i);
  if (discMatch) discount = parseNumber(discMatch[1]);

  const totalMatch = rawCleaned.match(/(?:TOTAL|GRAND\s*TOTAL|AMOUNT\s*DUE)\s*:?\s*\*?([0-9,]+\.[0-9]{2})/i);
  if (totalMatch) {
    total = parseNumber(totalMatch[1]);
  } else if (subtotal > 0) {
    total = subtotal + tax - discount;
  } else if (items.length > 0) {
    total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  }

  // 5. Payment Method
  let paymentMethod = "CASH";
  if (/CREDIT/i.test(rawCleaned)) paymentMethod = "CREDIT";
  else if (/TELEBIRR/i.test(rawCleaned)) paymentMethod = "TELEBIRR";
  else if (/CBE(?:\s*BIRR)?/i.test(rawCleaned)) paymentMethod = "CBE BIRR";
  else if (/CARD|VISA|MASTERCARD/i.test(rawCleaned)) paymentMethod = "CARD";

  // 6. Status Check
  let status: "valid" | "voided" | "review" = "valid";
  if (/VOID|CANCEL|REFUND/i.test(rawCleaned)) {
    status = "voided";
  }

  return {
    receiptNumber,
    date: date || new Date().toISOString().split("T")[0],
    time: time || "12:00:00",
    items,
    subtotal: subtotal || total,
    tax,
    discount,
    total,
    paymentMethod,
    status,
    rawText: rawBlock,
  };
}

/**
 * Parses generic / international POS journal receipt
 */
function parseGenericReceipt(raw: string, index: number): ParsedReceipt {
  let receiptNumber = String(index + 1).padStart(4, "0");
  let date = "";
  let time = "";
  let subtotal = 0;
  let tax = 0;
  let discount = 0;
  let total = 0;
  let paymentMethod = "CASH";
  let status: "valid" | "voided" | "review" = "valid";
  const items: ParsedItem[] = [];

  const numMatch = raw.match(/(?:RECEIPT|INVOICE|TRANSACTION|TICKET|BILL)\s*#?\s*:?\s*([0-9A-Za-z\-]+)/i);
  if (numMatch) receiptNumber = numMatch[1];

  const dateMatch = raw.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/) || raw.match(/(\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/);
  if (dateMatch) date = dateMatch[1];

  const timeMatch = raw.match(/(\d{2}:\d{2}(?::\d{2})?)/);
  if (timeMatch) time = timeMatch[1];

  const lines = raw.split(/\r?\n/).map(cleanLine);
  for (const line of lines) {
    if (!line || /^(?:TOTAL|SUBTOTAL|VAT|TAX|DISCOUNT|CASH|CHANGE|====|----|\*\*\*\*)/i.test(line)) continue;
    const match = line.match(/^(.+?)\s{2,}(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/);
    if (match) {
      items.push({
        description: match[1].trim(),
        quantity: parseNumber(match[2]),
        unitPrice: parseNumber(match[3]),
        lineTotal: parseNumber(match[4]),
      });
    }
  }

  const subMatch = raw.match(/(?:SUB\s*-?\s*TOTAL|SUBTOTAL)\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
  if (subMatch) subtotal = parseNumber(subMatch[1]);

  const taxMatch = raw.match(/(?:TAX|VAT(?:\s*\(\d+%?\))?)\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
  if (taxMatch) tax = parseNumber(taxMatch[1]);

  const totalMatch = raw.match(/(?:TOTAL|GRAND\s*TOTAL|AMOUNT\s*DUE)\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
  if (totalMatch) {
    total = parseNumber(totalMatch[1]);
  } else if (items.length > 0) {
    total = items.reduce((s, it) => s + it.lineTotal, 0);
  }

  if (/TELEBIRR/i.test(raw)) paymentMethod = "TELEBIRR";
  else if (/CBE/i.test(raw)) paymentMethod = "CBE";
  else if (/CARD|VISA/i.test(raw)) paymentMethod = "CARD";

  if (/VOID|CANCEL/i.test(raw)) status = "voided";

  return {
    receiptNumber,
    date: date || new Date().toISOString().split("T")[0],
    time: time || "12:00:00",
    items,
    subtotal: subtotal || total,
    tax,
    discount,
    total,
    paymentMethod,
    status,
    rawText: raw,
  };
}

/**
 * Main parser entry point: scans POS journal content, detects format,
 * deduplicates receipts from dual-roll journals, and calculates accurate metrics.
 */
export function parsePOSJournal(content: string): ScanResult {
  const warnings: string[] = [];

  if (!content || content.trim().length === 0) {
    return {
      format: "Empty File",
      totalReceipts: 0,
      parsedReceipts: 0,
      reviewCount: 0,
      receipts: [],
      warnings: ["File is empty."],
    };
  }

  // 1. Detect if this is an Ethiopian Fiscal Cash Register journal
  const hasFS = /(?<!ACCU\.)(?<!SESSION\.)FS\s*No\.?\s*[0-9]+/i.test(content) || /FS\s*#/i.test(content);
  const isEthiopian = hasFS || /TIN:\s*[0-9]+/i.test(content) || /SESSION\s+Z\s+REPORT/i.test(content);

  if (isEthiopian && hasFS) {
    const format = "Ethiopian Fiscal Cash Register";

    // Clean lines of any machine tab/index prefixes
    const cleanedLines = content.split(/\r?\n/).map(cleanLine);
    const cleanedText = cleanedLines.join("\n");

    // Split text into blocks starting at TIN header or FS No
    const rawBlocks = cleanedText.split(/\n(?=TIN:\s*[0-9]+|FS\s*No\.?\s*[0-9]+)/i);

    // Map by unique FS Number to eliminate duplicate customer/audit journal rolls!
    const uniqueReceiptsMap = new Map<string, ParsedReceipt>();

    let index = 0;
    for (const blk of rawBlocks) {
      // Safely ignore Session Z Reports and Daily Z Reports!
      if (
        /SESSION\s+Z\s+REPORT/i.test(blk) ||
        /DAILY\s+Z-REPORT/i.test(blk) ||
        /\*\*\*\s*SALES\s+REPORT\s*\*\*\*/i.test(blk)
      ) {
        continue;
      }

      // Check if this block contains an authentic FS receipt number
      const m = blk.match(/(?<!ACCU\.)(?<!SESSION\.)FS\s*No\.?\s*([0-9]+)/i) ||
                blk.match(/FS\s*#?\s*([0-9]+)/i);

      if (m) {
        const fsNum = m[1];
        if (!uniqueReceiptsMap.has(fsNum)) {
          const parsed = parseEthiopianReceipt(blk, index++);
          uniqueReceiptsMap.set(fsNum, parsed);
        }
      }
    }

    const receipts = Array.from(uniqueReceiptsMap.values());

    const voidedCount = receipts.filter((r) => r.status === "voided").length;
    if (voidedCount > 0) {
      warnings.push(`${voidedCount} voided receipt(s) detected`);
    }

    return {
      format,
      totalReceipts: receipts.length,
      parsedReceipts: receipts.length,
      reviewCount: receipts.filter((r) => r.status === "review").length,
      receipts,
      warnings,
    };
  }

  // 2. Generic POS journal fallback
  const format = /DATECS|DAISY|ACLAS|BMC/i.test(content)
    ? "Fiscal Hardware Journal"
    : "Standard POS Journal";

  // Split by primary receipt delimiters or divider lines
  const borderRegex = /\n\s*[=\*]{5,}\s*\n/g;
  let blocks = content.split(borderRegex).map((b) => b.trim()).filter((b) => b.length > 25);

  if (blocks.length <= 1) {
    // Try splitting by RECEIPT #
    blocks = content.split(/\n(?=RECEIPT\s*#|INVOICE\s*#|TRANSACTION\s*#)/i).map((b) => b.trim()).filter((b) => b.length > 25);
  }

  // Filter out terminal reports
  blocks = blocks.filter((b) => !/END\s+OF\s+JOURNAL|DAILY\s+Z-REPORT|TERMINAL\s+REPORT/i.test(b));

  // Deduplicate by receipt number
  const uniqueGenericMap = new Map<string, ParsedReceipt>();
  blocks.forEach((blk, idx) => {
    const parsed = parseGenericReceipt(blk, idx);
    if (!uniqueGenericMap.has(parsed.receiptNumber)) {
      uniqueGenericMap.set(parsed.receiptNumber, parsed);
    }
  });

  const receipts = Array.from(uniqueGenericMap.values());

  return {
    format,
    totalReceipts: receipts.length,
    parsedReceipts: receipts.length,
    reviewCount: 0,
    receipts,
    warnings,
  };
}
