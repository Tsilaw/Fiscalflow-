"use client";

import { Navbar } from "@/components/navbar";
import { FiscalConverterWidget } from "@/components/fiscal-converter-widget";
import { useState } from "react";
import {
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Search,
  Download,
  Clock,
  X,
} from "lucide-react";

export default function LandingPage() {
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [searchOrderId, setSearchOrderId] = useState("");
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchOrderId.trim()) return;

    setSearchLoading(true);
    setSearchError("");
    setTrackedOrder(null);

    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        const found = data.orders?.find(
          (o: any) =>
            o.id.toLowerCase() === searchOrderId.trim().toLowerCase() ||
            o.original_filename?.toLowerCase().includes(searchOrderId.trim().toLowerCase()) ||
            o.transaction_reference?.toLowerCase() === searchOrderId.trim().toLowerCase()
        );
        if (found) {
          setTrackedOrder(found);
        } else {
          setSearchError("No order found with that ID or reference.");
        }
      } else {
        setSearchError("Please log in to track existing orders.");
      }
    } catch {
      setSearchError("Failed to lookup order.");
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col transition-colors">
      <Navbar onTrackOrderClick={() => setTrackModalOpen(true)} />

      {/* ===== HERO / CONVERTER CARD ===== */}
      <section className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-12 pb-12 sm:pb-16 w-full flex flex-col items-center">
        <FiscalConverterWidget />
      </section>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <section id="how-it-works" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 w-full border-t border-line">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-ink mb-3">
            How it works
          </h2>
          <p className="text-muted text-sm sm:text-base">
            From raw POS journal export to balanced spreadsheet in four simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-2xl bg-surface border border-line flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="w-8 h-8 rounded-lg bg-accent text-on-accent font-bold flex items-center justify-center text-sm mb-5">
              1
            </div>
            <h3 className="font-heading font-bold text-lg text-ink mb-2">Upload .txt</h3>
            <p className="text-muted text-xs sm:text-sm leading-relaxed">
              Export the journal file from your fiscal cash register and drop it in.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-line flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="w-8 h-8 rounded-lg bg-accent text-on-accent font-bold flex items-center justify-center text-sm mb-5">
              2
            </div>
            <h3 className="font-heading font-bold text-lg text-ink mb-2">Scan & Count</h3>
            <p className="text-muted text-xs sm:text-sm leading-relaxed">
              We count authentic receipt records only. Summaries, headers, and Z-reports are never double-billed.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-line flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="w-8 h-8 rounded-lg bg-accent text-on-accent font-bold flex items-center justify-center text-sm mb-5">
              3
            </div>
            <h3 className="font-heading font-bold text-lg text-ink mb-2">Pay & Verify</h3>
            <p className="text-muted text-xs sm:text-sm leading-relaxed">
              Pay 3 ETB per valid receipt via Telebirr or CBE. Our staff verifies the bank credit.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-line flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="w-8 h-8 rounded-lg bg-accent text-on-accent font-bold flex items-center justify-center text-sm mb-5">
              4
            </div>
            <h3 className="font-heading font-bold text-lg text-ink mb-2">Download .xlsx</h3>
            <p className="text-muted text-xs sm:text-sm leading-relaxed">
              Download clean Excel workbooks with itemized transactions and summary sheets ready for audit.
            </p>
          </div>
        </div>
      </section>

      {/* ===== PRICING BAND ===== */}
      <section id="pricing" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-10 w-full">
        <div className="rounded-3xl bg-panel text-white p-8 sm:p-12 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
            <div>
              <span className="text-accent text-xs font-bold uppercase tracking-wider block mb-1">
                Transparent Fee
              </span>
              <h2 className="font-heading font-bold text-2xl sm:text-3xl lg:text-[38px] leading-snug mb-3">
                Simple, visible pricing
              </h2>
              <p className="text-panel-muted text-sm sm:text-base leading-relaxed">
                Total fee = valid receipts × 3 ETB. You always see the exact receipt count before you pay.
              </p>
            </div>

            <div className="space-y-3 bg-white/5 p-6 rounded-2xl border border-white/10 font-mono text-sm sm:text-base">
              <div className="flex justify-between items-center">
                <span className="text-panel-muted font-sans font-medium">10 receipts</span>
                <span className="font-bold">30 ETB</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-panel-muted font-sans font-medium">100 receipts</span>
                <span className="font-bold">300 ETB</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-panel-muted font-sans font-medium">1,000 receipts</span>
                <span className="font-bold">3,000 ETB</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BUILT ON TRUST / FAQ ===== */}
      <section id="faq" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 w-full">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-ink mb-3">
            Built on trust
          </h2>
          <p className="text-muted text-sm sm:text-base">
            Designed for Ethiopian accountants, auditors, and business owners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-surface border border-line flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all">
            <h3 className="font-heading font-bold text-base sm:text-lg text-ink mb-2">
              No uncertain charges
            </h3>
            <p className="text-muted text-xs sm:text-sm leading-relaxed">
              If receipt boundaries cannot be confidently identified, files are flagged for manual review rather than billing an uncertain count.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-line flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all">
            <h3 className="font-heading font-bold text-base sm:text-lg text-ink mb-2">
              Payments verified
            </h3>
            <p className="text-muted text-xs sm:text-sm leading-relaxed">
              Screenshots and reference IDs are audited against our receiving account before files are released.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-line flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all">
            <h3 className="font-heading font-bold text-base sm:text-lg text-ink mb-2">
              Private by default
            </h3>
            <p className="text-muted text-xs sm:text-sm leading-relaxed">
              Your financial data and workbooks are private and accessible solely by you and authorized system administrators.
            </p>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="mt-auto border-t border-line bg-surface/50 py-8">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted text-center sm:text-left">
          <div>FiscalFlow Enterprise © 2026. All rights reserved.</div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <a href="#how-it-works" className="hover:text-ink transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
            <a href="/admin" className="hover:text-ink transition-colors font-semibold">Admin Panel</a>
          </div>
        </div>
      </footer>

      {/* ===== TRACK ORDER MODAL ===== */}
      {trackModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-up">
          <div className="w-full max-w-md bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-accent" />
                <h3 className="font-heading font-bold text-lg text-ink">
                  Track Order
                </h3>
              </div>
              <button
                onClick={() => setTrackModalOpen(false)}
                className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSearchOrder} className="space-y-3">
              <label className="block text-xs font-semibold text-muted">
                Order ID or Transaction Reference
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  placeholder="e.g. TLB-998877 or order ID"
                  className="flex-1 h-11 px-3.5 rounded-xl border border-line bg-bg text-ink text-xs sm:text-sm font-mono focus:outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="h-11 px-5 rounded-xl bg-accent text-on-accent text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {searchLoading ? "Searching..." : "Track"}
                </button>
              </div>
            </form>

            {searchError && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs">
                {searchError}
              </div>
            )}

            {trackedOrder && (
              <div className="p-4 rounded-xl bg-surface-lifted border border-line space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-semibold text-ink truncate max-w-[200px]">
                    {trackedOrder.original_filename}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      trackedOrder.status === "completed"
                        ? "bg-success/15 text-success"
                        : trackedOrder.status === "rejected"
                        ? "bg-error/15 text-error"
                        : "bg-warning/15 text-warning"
                    }`}
                  >
                    {trackedOrder.status === "completed"
                      ? "Approved"
                      : trackedOrder.status === "rejected"
                      ? "Rejected"
                      : "Pending Verification"}
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[11px]">
                  <div>Receipts: <span className="font-bold text-ink">{trackedOrder.receipt_count}</span></div>
                  <div>Amount: <span className="font-bold text-accent">{trackedOrder.total_amount} {trackedOrder.currency}</span></div>
                  <div>Ref: <span className="text-muted">{trackedOrder.transaction_reference || "N/A"}</span></div>
                </div>

                {trackedOrder.status === "completed" && (
                  <a
                    href={`/api/download/${trackedOrder.id}`}
                    className="w-full h-10 mt-2 rounded-xl bg-accent text-on-accent text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Excel (.xlsx)</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
