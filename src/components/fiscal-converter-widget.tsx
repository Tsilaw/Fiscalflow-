"use client";

import { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  ImageIcon,
} from "lucide-react";

type Step = "upload" | "review" | "pay" | "proof" | "track";

interface ScanData {
  fileId: string;
  orderId: string;
  scan: {
    format: string;
    totalReceipts: number;
    parsedReceipts: number;
    reviewCount: number;
    warnings: string[];
    preview?: Array<{
      receiptNumber: string;
      date: string;
      time: string;
      total: number;
      itemCount: number;
      paymentMethod: string;
    }>;
  };
  pricing: {
    unitPrice: number;
    currency: string;
    totalAmount: number;
  };
}

interface PaymentMethodItem {
  id: string;
  name: string;
  account_number: string;
  account_name: string;
  instructions: string;
  enabled: number;
}

export function FiscalConverterWidget() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Dynamic Settings (loaded from admin DB)
  const [unitPrice, setUnitPrice] = useState<number>(3.0);
  const [currency, setCurrency] = useState<string>("ETB");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);

  // Scan & Order data
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [scanData, setScanData] = useState<ScanData | null>(null);

  // Payment inputs
  const [selectedMethodId, setSelectedMethodId] = useState<string>("telebirr");
  const [txReference, setTxReference] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Order status
  const [orderStatus, setOrderStatus] = useState<string>("scan_complete");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const stepsList: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "review", label: "Review fee" },
    { key: "pay", label: "Pay" },
    { key: "proof", label: "Send proof" },
    { key: "track", label: "Track" },
  ];

  // Load active pricing & payment methods from backend
  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (d?.pricing) {
          setUnitPrice(d.pricing.price_per_receipt || 3.0);
          setCurrency(d.pricing.currency || "ETB");
        }
      })
      .catch(() => {});

    fetch("/api/payment-methods")
      .then((r) => r.json())
      .then((d) => {
        if (d?.paymentMethods && Array.isArray(d.paymentMethods)) {
          setPaymentMethods(d.paymentMethods);
          if (d.paymentMethods.length > 0) {
            setSelectedMethodId(d.paymentMethods[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Upload handler
  const handleUploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setErrorMsg("Please select a .txt fiscal export file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg("File size exceeds 15 MB limit.");
      return;
    }

    setErrorMsg("");
    setIsProcessing(true);
    setSelectedFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Ensure session exists
      const meCheck = await fetch("/api/auth/me");
      if (!meCheck.ok) {
        await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: "Fiscal Customer",
            email: `guest_${Date.now()}@fiscalflow.io`,
            phone: "+251900000000",
            password: "password123",
          }),
        });
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      let data: any = {};
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => "");
        data = { error: text.slice(0, 150) || `Server error (${res.status})` };
      }

      if (!res.ok) {
        setErrorMsg(data.error || "File scan failed.");
      } else {
        setScanData(data);
        setOrderStatus("scan_complete");
        setCurrentStep("review");
      }
    } catch (err: any) {
      console.error("[UPLOAD_CLIENT_ERROR]", err);
      setErrorMsg(err?.message || "Failed to upload file. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSampleData = async () => {
    setIsProcessing(true);
    setErrorMsg("");
    try {
      const res = await fetch("/sample_journal.txt");
      const blob = await res.blob();
      const sampleFile = new File([blob], "sample_monthly_fiscal_export.txt", { type: "text/plain" });
      await handleUploadFile(sampleFile);
    } catch (err) {
      setErrorMsg("Could not load sample file.");
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Screenshot change
  const handleScreenshotChange = (file: File | null) => {
    setScreenshotFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setScreenshotPreview(url);
    } else {
      setScreenshotPreview(null);
    }
  };

  // Submit payment proof (Transaction Number OR Screenshot OR both)
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanData) return;

    if (!txReference.trim() && !screenshotFile) {
      setErrorMsg("Please enter your transaction reference number OR upload a screenshot.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg("");

    const activeMethod = paymentMethods.find((m) => m.id === selectedMethodId);
    const methodName = activeMethod?.name || (selectedMethodId === "cbe" ? "CBE" : "Telebirr");

    const formData = new FormData();
    formData.append("paymentMethod", methodName);
    formData.append("transactionReference", txReference.trim() || "Screenshot provided");
    if (screenshotFile) {
      formData.append("evidence", screenshotFile);
    }

    try {
      const res = await fetch(`/api/orders/${scanData.orderId}/pay`, {
        method: "POST",
        body: formData,
      });

      let data: any = {};
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => "");
        data = { error: text.slice(0, 150) || `Server error (${res.status})` };
      }

      if (!res.ok) {
        setErrorMsg(data.error || "Payment submission failed.");
      } else {
        setOrderStatus("pending_verification");
        setCurrentStep("track");
      }
    } catch (err: any) {
      console.error("[PAY_CLIENT_ERROR]", err);
      setErrorMsg(err?.message || "Failed to submit payment proof. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Poll order status if in track mode
  useEffect(() => {
    if (currentStep !== "track" || !scanData) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/orders");
        if (res.ok) {
          const data = await res.json();
          const current = data.orders?.find((o: any) => o.id === scanData.orderId);
          if (current) {
            setOrderStatus(current.status);
            if (current.rejection_reason) {
              setRejectionReason(current.rejection_reason);
            }
          }
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [currentStep, scanData]);

  const getStepIndex = (s: Step) => stepsList.findIndex((item) => item.key === s);
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full max-w-[840px] mx-auto rounded-3xl bg-surface border border-line p-4 sm:p-8 md:p-10 shadow-xl transition-all">
      {/* Eyebrow Pill (Dynamically shows configured price) */}
      <div className="flex justify-center mb-5 sm:mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
          <span>{unitPrice} {currency} per receipt</span>
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-ink tracking-tight mb-2 sm:mb-3">
          Turn your monthly receipt export into Excel.
        </h1>
        <p className="text-muted text-xs sm:text-sm md:text-base leading-relaxed px-2">
          Upload the <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg border border-line font-medium text-ink">.txt</span> file from your fiscal receipt machine, pay by Telebirr or CBE, and download a clean spreadsheet once we confirm your payment.
        </p>
      </div>

      {/* Stepper Navigation */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3 mb-6 sm:mb-8">
        {stepsList.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isDone = idx < currentIndex;
          return (
            <div
              key={step.key}
              onClick={() => {
                if (isDone || (scanData && idx <= currentIndex)) {
                  setCurrentStep(step.key);
                }
              }}
              className={`flex flex-col gap-1.5 sm:gap-2 cursor-pointer group text-center ${
                !isDone && !isActive ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              <span
                className={`text-[11px] sm:text-xs md:text-[13px] font-semibold transition-colors truncate ${
                  isActive ? "text-accent font-bold" : isDone ? "text-ink" : "text-muted"
                }`}
              >
                {step.key === "review" ? (
                  <>
                    <span>Review</span>
                    <span className="hidden sm:inline"> fee</span>
                  </>
                ) : step.key === "proof" ? (
                  <>
                    <span className="hidden sm:inline">Send </span>
                    <span>Proof</span>
                  </>
                ) : (
                  step.label
                )}
              </span>
              {/* Bottom indicator bar */}
              <div
                className={`h-1 sm:h-1.5 rounded-full transition-all ${
                  isActive
                    ? "bg-[#10B981]"
                    : isDone
                    ? "bg-[#10B981]/50"
                    : "bg-[#E5E7EB] dark:bg-[#353B45]"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs sm:text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ===== STEP 1: UPLOAD ===== */}
      {currentStep === "upload" && (
        <div className="space-y-4 animate-fade-in-up">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-6 sm:p-10 md:p-14 flex flex-col items-center justify-center text-center transition-all bg-surface-lifted/40 ${
              dragActive
                ? "border-accent bg-accent/5 scale-[1.01]"
                : "border-line hover:border-muted"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadFile(e.target.files[0]);
                }
              }}
            />

            {/* Cloud Icon */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#E8F5E9] dark:bg-[#1B3828] text-[#2E7D32] dark:text-[#4ADE80] flex items-center justify-center mb-3 sm:mb-4 shadow-sm border border-[#C8E6C9] dark:border-[#2E7D32]/30">
              <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <h3 className="font-heading font-bold text-base sm:text-lg md:text-xl text-ink mb-1.5">
              {isProcessing ? "Scanning receipt records..." : "Choose your monthly .txt export"}
            </h3>
            <p className="text-muted text-xs sm:text-sm mb-5 sm:mb-6">
              Fiscal machine export only. Maximum 15 MB.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto h-11 px-7 rounded-full bg-[#1E2227] text-white hover:bg-[#111827] dark:bg-[#B5AFA6] dark:text-[#1E2227] dark:hover:bg-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <span>Select .txt file</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSampleData}
                className="w-full sm:w-auto h-11 px-7 rounded-full border border-line bg-surface hover:bg-bg text-ink dark:border-[#B5AFA6]/30 dark:text-[#B5AFA6] dark:hover:text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                <span>Try with sample data</span>
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] sm:text-xs text-muted max-w-lg mx-auto pt-1 sm:pt-2 px-2">
            Only authentic fiscal machine records are counted. Summary records and Z-reports are safely ignored.
          </p>
        </div>
      )}

      {/* ===== STEP 2: REVIEW FEE ===== */}
      {currentStep === "review" && scanData && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="p-6 rounded-2xl bg-surface-lifted border border-line space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2 text-ink font-semibold text-sm">
                <FileText className="w-4 h-4 text-accent" />
                <span className="font-mono text-xs truncate max-w-[240px]">
                  {selectedFileName}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-accent/15 text-accent text-xs font-semibold">
                Scan Completed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-bg border border-line">
                <span className="text-[11px] text-muted block mb-1">Detected Receipts</span>
                <span className="font-heading font-bold text-2xl text-ink">
                  {scanData.scan.parsedReceipts}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-bg border border-line">
                <span className="text-[11px] text-muted block mb-1">Rate per Receipt</span>
                <span className="font-heading font-bold text-2xl text-ink">
                  {scanData.pricing.unitPrice} {scanData.pricing.currency}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-bg border border-line col-span-2 sm:col-span-1">
                <span className="text-[11px] text-muted block mb-1">Total Service Fee</span>
                <span className="font-heading font-bold text-2xl text-accent">
                  {scanData.pricing.totalAmount} {scanData.pricing.currency}
                </span>
              </div>
            </div>

            {scanData.scan.preview && scanData.scan.preview.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-muted block">
                  Scanned Receipts Preview (first {scanData.scan.preview.length} of {scanData.scan.parsedReceipts} receipts):
                </span>
                <div className="rounded-xl border border-line bg-bg overflow-x-auto text-xs shadow-inner">
                  <div className="min-w-[340px]">
                    <div className="grid grid-cols-4 p-2.5 font-semibold text-muted border-b border-line bg-surface-lifted text-[11px]">
                      <div>Receipt #</div>
                      <div>Date & Time</div>
                      <div>Items</div>
                      <div className="text-right">Total (ETB)</div>
                    </div>
                    {scanData.scan.preview.map((p: any, i: number) => (
                      <div key={i} className="grid grid-cols-4 p-2.5 border-b border-line last:border-b-0 items-center font-mono text-[11px]">
                        <div className="font-bold text-ink truncate">#{p.receiptNumber}</div>
                        <div className="text-muted truncate">{p.date} {p.time}</div>
                        <div>{p.itemCount} item(s)</div>
                        <div className="text-right font-bold text-accent">{p.total.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {scanData.scan.warnings?.length > 0 && (
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs space-y-1">
                {scanData.scan.warnings.map((w, idx) => (
                  <div key={idx}>⚠️ {w}</div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setCurrentStep("upload")}
              className="w-full sm:w-auto text-center text-xs text-muted hover:text-ink font-semibold py-2 underline underline-offset-4"
            >
              ← Upload a different file
            </button>

            <button
              onClick={() => setCurrentStep("pay")}
              className="w-full sm:w-auto h-11 px-6 rounded-full bg-accent text-on-accent font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 shadow transition-all"
            >
              <span>Continue to payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP 3: PAY (CBE & TELEBIRR DETAILS) ===== */}
      {currentStep === "pay" && scanData && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="p-5 sm:p-6 rounded-2xl bg-surface-lifted border border-line space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
              <h3 className="font-heading font-bold text-lg text-ink">
                Payment Instructions
              </h3>
              <div className="text-xs font-semibold px-3 py-1 rounded-full bg-accent/15 text-accent self-start sm:self-auto">
                Total Due: {scanData.pricing.totalAmount} {scanData.pricing.currency}
              </div>
            </div>
            <p className="text-xs text-muted">
              Transfer the exact fee using <strong>Telebirr</strong> or <strong>Commercial Bank of Ethiopia (CBE)</strong>:
            </p>

            <div className="space-y-3">
              {paymentMethods.length > 0 ? (
                paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="p-4 rounded-xl bg-bg border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-ink flex items-center gap-2">
                        <span>{pm.name}</span>
                        {pm.id === "telebirr" && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-semibold">
                            Instant
                          </span>
                        )}
                        {pm.id === "cbe" && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-500 font-semibold">
                            CBE Birr / Mobile
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-sm sm:text-base text-ink font-bold mt-1">
                        {pm.account_number}
                      </div>
                      <div className="text-[11px] text-muted">Account Name: {pm.account_name}</div>
                      {pm.instructions && (
                        <div className="text-[11px] text-muted/80 mt-1 italic">{pm.instructions}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(pm.account_number, pm.id)}
                      className="h-8 px-3 rounded-lg border border-line bg-surface hover:bg-bg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-center"
                    >
                      {copiedKey === pm.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-accent" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-muted" />
                          <span>Copy Account</span>
                        </>
                      )}
                    </button>
                  </div>
                ))
              ) : (
                /* Fallback if still loading */
                <>
                  <div className="p-4 rounded-xl bg-bg border border-line flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-ink">Telebirr</div>
                      <div className="font-mono text-sm text-ink font-bold mt-0.5">0911 234 567</div>
                      <div className="text-[11px] text-muted">Account Name: FiscalFlow Enterprise</div>
                    </div>
                    <button
                      onClick={() => handleCopy("0911234567", "telebirr")}
                      className="h-8 px-3 rounded-lg border border-line text-xs font-semibold"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="p-4 rounded-xl bg-bg border border-line flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-ink">Commercial Bank of Ethiopia (CBE)</div>
                      <div className="font-mono text-sm text-ink font-bold mt-0.5">1000 1234 56789</div>
                      <div className="text-[11px] text-muted">Account Name: FiscalFlow Enterprise</div>
                    </div>
                    <button
                      onClick={() => handleCopy("1000123456789", "cbe")}
                      className="h-8 px-3 rounded-lg border border-line text-xs font-semibold"
                    >
                      Copy
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setCurrentStep("review")}
              className="w-full sm:w-auto text-center text-xs text-muted hover:text-ink font-semibold py-2"
            >
              ← Back to fee review
            </button>

            <button
              onClick={() => setCurrentStep("proof")}
              className="w-full sm:w-auto h-11 px-6 rounded-full bg-accent text-on-accent font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 shadow transition-all"
            >
              <span>I have transferred the fee</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP 4: SEND PROOF (TRANSACTION # OR SCREENSHOT) ===== */}
      {currentStep === "proof" && scanData && (
        <form onSubmit={handleSubmitProof} className="space-y-5 animate-fade-in-up">
          <div className="p-6 rounded-2xl bg-surface-lifted border border-line space-y-4">
            <h3 className="font-heading font-bold text-lg text-ink">
              Submit Payment Proof
            </h3>
            <p className="text-xs text-muted">
              Enter your transaction reference number <strong>OR</strong> upload a payment screenshot (or both) so our administrator can verify and release your Excel file.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Payment Method
                </label>
                <select
                  value={selectedMethodId}
                  onChange={(e) => setSelectedMethodId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-line bg-bg text-ink text-xs sm:text-sm focus:outline-none"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                  {paymentMethods.length === 0 && (
                    <>
                      <option value="telebirr">Telebirr</option>
                      <option value="cbe">Commercial Bank of Ethiopia (CBE)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Transaction / Reference ID
                </label>
                <input
                  type="text"
                  value={txReference}
                  onChange={(e) => setTxReference(e.target.value)}
                  placeholder="e.g. TLB12984920 or FT261198"
                  className="w-full h-11 px-3.5 rounded-xl border border-line bg-bg text-ink font-mono text-xs sm:text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Payment Screenshot / Receipt Image
              </label>
              <div className="flex flex-col gap-2">
                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleScreenshotChange(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-line file:bg-bg file:text-ink file:font-semibold"
                />
                {screenshotPreview && (
                  <div className="mt-2 p-2 rounded-xl border border-line bg-bg inline-flex items-center gap-3">
                    <img
                      src={screenshotPreview}
                      alt="Payment screenshot preview"
                      className="w-16 h-16 object-cover rounded-lg border border-line"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-ink block">{screenshotFile?.name}</span>
                      <span className="text-muted text-[11px]">Ready to upload</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep("pay")}
              className="w-full sm:w-auto text-center text-xs text-muted hover:text-ink font-semibold py-2"
            >
              ← Back to account details
            </button>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full sm:w-auto h-11 px-6 rounded-full bg-accent text-on-accent font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 shadow transition-all disabled:opacity-50"
            >
              {isProcessing ? "Submitting..." : "Send proof for verification"}
            </button>
          </div>
        </form>
      )}

      {/* ===== STEP 5: TRACK ===== */}
      {currentStep === "track" && scanData && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="p-8 rounded-2xl bg-surface-lifted border border-line text-center space-y-4">
            {orderStatus === "completed" ? (
              <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : orderStatus === "rejected" ? (
              <div className="w-16 h-16 rounded-full bg-error/15 text-error flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-warning/15 text-warning flex items-center justify-center mx-auto mb-2">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
            )}

            <div>
              <h3 className="font-heading font-bold text-2xl text-ink">
                {orderStatus === "completed"
                  ? "Approved & Converted!"
                  : orderStatus === "rejected"
                  ? "Verification Rejected"
                  : "Awaiting Admin Approval"}
              </h3>
              <p className="text-xs sm:text-sm text-muted mt-1 max-w-md mx-auto">
                {orderStatus === "completed"
                  ? "Your payment was confirmed by an administrator. Your clean Excel (.xlsx) file is ready for download below!"
                  : orderStatus === "rejected"
                  ? rejectionReason || "The payment could not be confirmed. You can resubmit corrected evidence."
                  : "An administrator is reviewing your payment against our receiving account. Verification typically completes quickly."}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-bg border border-line text-xs font-mono w-full max-w-sm mx-auto text-left space-y-1 overflow-hidden">
              <div className="truncate"><span className="text-muted">Order ID:</span> <span className="font-semibold text-ink">{scanData.orderId}</span></div>
              <div className="truncate"><span className="text-muted">File:</span> <span className="font-semibold text-ink">{selectedFileName}</span></div>
              <div><span className="text-muted">Receipts:</span> <span className="font-semibold text-ink">{scanData.scan.parsedReceipts}</span></div>
              <div><span className="text-muted">Amount:</span> <span className="font-semibold text-accent font-bold">{scanData.pricing.totalAmount} ETB</span></div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3 w-full">
              {orderStatus === "completed" ? (
                <a
                  href={`/api/download/${scanData.orderId}`}
                  className="w-full sm:w-auto h-12 px-8 rounded-full bg-accent text-on-accent font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 shadow-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Clean Excel (.xlsx)</span>
                </a>
              ) : orderStatus === "rejected" ? (
                <button
                  onClick={() => setCurrentStep("proof")}
                  className="w-full sm:w-auto h-11 px-6 rounded-full bg-accent text-on-accent font-semibold text-xs sm:text-sm hover:opacity-90 shadow"
                >
                  Resubmit Corrected Proof
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
                  <span>Checking status automatically...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
