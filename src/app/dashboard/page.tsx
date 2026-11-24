"use client";

import { Navbar } from "@/components/navbar";
import { FiscalConverterWidget } from "@/components/fiscal-converter-widget";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  CreditCard,
  RefreshCw,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserAndOrders();
  }, []);

  const fetchUserAndOrders = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      const ordersRes = await fetch("/api/orders");
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted font-medium">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <Navbar />

      <main className="max-w-[1200px] mx-auto px-5 sm:px-8 py-10 w-full space-y-12">
        {/* Welcome header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
          <div>
            <h1 className="font-heading font-bold text-3xl text-ink">
              Welcome back, {user?.fullName || user?.full_name || "User"}
            </h1>
            <p className="text-muted text-sm mt-1">
              Upload your fiscal monthly receipts, review pricing, and download structured Excel workbooks.
            </p>
          </div>

          <button
            onClick={fetchUserAndOrders}
            className="h-10 px-4 rounded-xl border border-line bg-surface text-ink text-xs font-semibold flex items-center gap-2 hover:bg-bg self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh orders</span>
          </button>
        </div>

        {/* The New 5-Step Upload Widget */}
        <div className="flex justify-center">
          <FiscalConverterWidget />
        </div>

        {/* Orders / History List */}
        <div id="history" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-xl text-ink">
              Your Conversion Orders
            </h2>
            <span className="text-xs text-muted">
              {orders.length} order{orders.length === 1 ? "" : "s"} total
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface border border-line text-center text-muted text-sm">
              No files uploaded yet. Select or drop your monthly .txt export above to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-surface border border-line flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-muted transition-colors shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-bg border border-line flex items-center justify-center text-accent shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-ink text-sm sm:text-base">
                        {order.original_filename}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-1 font-mono">
                        <span>{order.receipt_count} receipts</span>
                        <span>•</span>
                        <span className="font-bold text-accent">{order.total_amount} {order.currency}</span>
                        <span>•</span>
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        {order.transaction_reference && (
                          <>
                            <span>•</span>
                            <span>Ref: {order.transaction_reference}</span>
                          </>
                        )}
                      </div>
                      {order.rejection_reason && (
                        <p className="text-xs text-error mt-1.5 font-medium">
                          Rejection note: {order.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    {order.status === "completed" && (
                      <span className="px-3 py-1 rounded-full bg-success/15 text-success text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    )}
                    {order.status === "pending_verification" && (
                      <span className="px-3 py-1 rounded-full bg-warning/15 text-warning text-xs font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Awaiting Verification
                      </span>
                    )}
                    {(order.status === "scan_complete" || order.status === "rejected") && (
                      <span className="px-3 py-1 rounded-full bg-muted/20 text-muted text-xs font-semibold flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        Awaiting Proof
                      </span>
                    )}

                    {/* Action Buttons */}
                    {order.status === "completed" && (
                      <a
                        href={`/api/download/${order.id}`}
                        className="h-10 px-5 rounded-xl bg-accent text-on-accent text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 shadow transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .xlsx</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
