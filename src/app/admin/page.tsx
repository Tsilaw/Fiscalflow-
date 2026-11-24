"use client";

import { Navbar } from "@/components/navbar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  RefreshCw,
  Settings,
  ShieldCheck,
  CreditCard,
  UserPlus,
  Save,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"orders" | "settings">("orders");

  // Stats & Orders
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings State
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [pricePerReceipt, setPricePerReceipt] = useState<number>(3.0);
  const [currency, setCurrency] = useState<string>("ETB");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);

  // Add Admin State
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [adminSuccessMsg, setAdminSuccessMsg] = useState("");

  // Reject Modal
  const [rejectingOrder, setRejectingOrder] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Evidence Viewer Modal
  const [viewingEvidenceOrder, setViewingEvidenceOrder] = useState<any>(null);

  // Notifications
  const [toastMsg, setToastMsg] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  useEffect(() => {
    fetchAdminData();
    fetchSettings();
  }, []);

  const fetchAdminData = async () => {
    try {
      const statsRes = await fetch("/api/admin/stats");
      if (!statsRes.ok) {
        router.push("/dashboard");
        return;
      }
      const statsData = await statsRes.json();
      setStats(statsData.stats);

      const ordersRes = await fetch("/api/admin/orders");
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.pricing) {
          setPricePerReceipt(data.pricing.price_per_receipt);
          setCurrency(data.pricing.currency);
        }
        if (data.paymentMethods) {
          setPaymentMethods(data.paymentMethods);
        }
        if (data.admins) {
          setAdminsList(data.admins);
        }
      }
    } catch {}
    finally {
      setSettingsLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    if (!confirm("Are you sure you verified this payment and want to approve conversion and generate the Excel file?")) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Approval failed");
      } else {
        showToast("Payment verified! Clean Excel workbook generated.");
        setViewingEvidenceOrder(null);
        fetchAdminData();
      }
    } catch {
      alert("Error approving order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingOrder) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${rejectingOrder.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Rejection failed");
      } else {
        setRejectingOrder(null);
        setRejectReason("");
        showToast("Order rejected with reason provided to customer.");
        fetchAdminData();
      }
    } catch {
      alert("Error rejecting order");
    } finally {
      setActionLoading(false);
    }
  };

  // Save Pricing
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/settings/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricePerReceipt, currency }),
      });
      if (res.ok) {
        showToast("Pricing updated successfully!");
      } else {
        alert("Failed to update pricing");
      }
    } catch {
      alert("Error saving pricing");
    }
  };

  // Save Payment Method
  const handleSavePaymentMethod = async (method: any) => {
    try {
      const res = await fetch("/api/admin/settings/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: method.id,
          name: method.name,
          accountNumber: method.account_number,
          accountName: method.account_name,
          instructions: method.instructions,
          enabled: method.enabled,
        }),
      });
      if (res.ok) {
        showToast(`${method.name} details saved!`);
      } else {
        alert("Failed to update payment method");
      }
    } catch {
      alert("Error saving payment method");
    }
  };

  // Add New Admin
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddAdminLoading(true);
    setAdminSuccessMsg("");

    try {
      const res = await fetch("/api/admin/settings/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newAdminName,
          email: newAdminEmail,
          password: newAdminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to add admin");
      } else {
        setAdminSuccessMsg("New administrator created successfully!");
        setNewAdminName("");
        setNewAdminEmail("");
        setNewAdminPassword("");
        fetchSettings();
        showToast("New administrator account created.");
      }
    } catch {
      alert("Error creating admin");
    } finally {
      setAddAdminLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted font-medium">
          Loading administrator panel...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <Navbar />

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 animate-fade-in-up">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      <main className="max-w-[1200px] mx-auto px-5 sm:px-8 py-10 w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-accent" />
              <h1 className="font-heading font-bold text-3xl text-ink">
                Administrator Panel
              </h1>
            </div>
            <p className="text-muted text-sm mt-1">
              Verify CBE & Telebirr payments, manage pricing, payment accounts, and administrators.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchAdminData(); fetchSettings(); }}
              className="h-10 px-4 rounded-xl border border-line bg-surface text-ink text-xs font-semibold flex items-center gap-2 hover:bg-bg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl bg-surface border border-line w-full sm:w-fit">
          <button
            onClick={() => setActiveTab("orders")}
            className={`h-10 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === "orders"
                ? "bg-accent text-on-accent shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Orders & Approvals</span>
            {stats?.pendingOrders > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-emerald-800 font-bold ml-1">
                {stats.pendingOrders}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`h-10 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === "settings"
                ? "bg-accent text-on-accent shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings & Configurations</span>
          </button>
        </div>

        {/* ===== TAB 1: ORDERS & APPROVALS ===== */}
        {activeTab === "orders" && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-surface border border-line">
                <div className="flex items-center gap-2 text-muted text-xs mb-2">
                  <Clock className="w-4 h-4 text-warning" />
                  <span>Pending Approvals</span>
                </div>
                <div className="font-heading font-bold text-3xl text-ink">
                  {stats?.pendingOrders || 0}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-line">
                <div className="flex items-center gap-2 text-muted text-xs mb-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span>Verified Revenue</span>
                </div>
                <div className="font-heading font-bold text-3xl text-ink">
                  {stats?.totalRevenue || 0} ETB
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-line">
                <div className="flex items-center gap-2 text-muted text-xs mb-2">
                  <FileText className="w-4 h-4 text-accent" />
                  <span>Converted Receipts</span>
                </div>
                <div className="font-heading font-bold text-3xl text-ink">
                  {stats?.totalReceipts || 0}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-line">
                <div className="flex items-center gap-2 text-muted text-xs mb-2">
                  <Users className="w-4 h-4 text-muted" />
                  <span>Total Users</span>
                </div>
                <div className="font-heading font-bold text-3xl text-ink">
                  {stats?.totalUsers || 0}
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="space-y-4">
              <h2 className="font-heading font-bold text-xl text-ink">
                Payment Submissions & Verification Queue
              </h2>

              <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-bg border-b border-line text-muted uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="px-5 py-3.5">Customer & File</th>
                        <th className="px-5 py-3.5">Receipts</th>
                        <th className="px-5 py-3.5">Amount</th>
                        <th className="px-5 py-3.5">Method & Proof</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Verification Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line font-medium">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-muted">
                            No orders recorded yet.
                          </td>
                        </tr>
                      ) : (
                        orders.map((o) => (
                          <tr key={o.id} className="hover:bg-bg/40 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-semibold text-ink">{o.customer_name}</div>
                              <div className="text-muted text-xs">{o.customer_email}</div>
                              <div className="text-muted text-[11px] font-mono mt-0.5 truncate max-w-[200px]">
                                {o.original_filename}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-ink font-semibold">
                              {o.receipt_count}
                            </td>

                            <td className="px-5 py-4 font-bold text-accent">
                              {o.total_amount} {o.currency}
                            </td>

                            <td className="px-5 py-4">
                              {o.payment_method ? (
                                <div>
                                  <div className="font-bold text-ink flex items-center gap-1.5">
                                    <span>{o.payment_method}</span>
                                    {o.evidence_path && (
                                      <button
                                        onClick={() => setViewingEvidenceOrder(o)}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-accent/15 text-accent hover:underline font-semibold"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>View Screenshot</span>
                                      </button>
                                    )}
                                  </div>
                                  <div className="font-mono text-xs text-muted mt-0.5">
                                    Ref: {o.transaction_reference || "N/A"}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted text-xs">Unpaid</span>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {o.status === "completed" && (
                                <span className="px-2.5 py-1 rounded-full bg-success/15 text-success text-xs font-semibold">
                                  Approved
                                </span>
                              )}
                              {o.status === "pending_verification" && (
                                <span className="px-2.5 py-1 rounded-full bg-warning/15 text-warning text-xs font-semibold">
                                  Needs Verification
                                </span>
                              )}
                              {o.status === "rejected" && (
                                <span className="px-2.5 py-1 rounded-full bg-error/15 text-error text-xs font-semibold">
                                  Rejected
                                </span>
                              )}
                              {o.status === "scan_complete" && (
                                <span className="px-2.5 py-1 rounded-full bg-muted/15 text-muted text-xs font-semibold">
                                  Unpaid
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {o.status === "pending_verification" && (
                                  <>
                                    <button
                                      disabled={actionLoading}
                                      onClick={() => handleApprove(o.id)}
                                      className="h-8 px-3.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow transition-all"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      disabled={actionLoading}
                                      onClick={() => setRejectingOrder(o)}
                                      className="h-8 px-3 rounded-lg bg-error text-white text-xs font-semibold hover:opacity-90 shadow transition-all"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {o.status === "completed" && (
                                  <a
                                    href={`/api/download/${o.id}`}
                                    className="h-8 px-3 rounded-lg border border-line bg-surface text-ink text-xs font-semibold flex items-center gap-1.5 hover:bg-bg shadow-sm"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>XLSX</span>
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB 2: SETTINGS (PRICING, PAYMENT METHODS, ADMINS) ===== */}
        {activeTab === "settings" && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Section 1: Pricing Settings */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-line">
                <div>
                  <h3 className="font-heading font-bold text-xl text-ink flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-accent" />
                    <span>Pricing Settings</span>
                  </h3>
                  <p className="text-muted text-xs sm:text-sm mt-0.5">
                    Configure the service charge per valid scanned receipt.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePricing} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">
                    Price Per Receipt
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={pricePerReceipt}
                    onChange={(e) => setPricePerReceipt(parseFloat(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-xl border border-line bg-bg text-ink font-bold text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">
                    Currency
                  </label>
                  <input
                    type="text"
                    required
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-line bg-bg text-ink font-bold text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                <button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-accent text-on-accent font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 shadow transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Pricing</span>
                </button>
              </form>
            </div>

            {/* Section 2: Payment Methods (CBE & Telebirr) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line shadow-sm space-y-6">
              <div>
                <h3 className="font-heading font-bold text-xl text-ink flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-accent" />
                  <span>Payment Accounts (CBE & Telebirr)</span>
                </h3>
                <p className="text-muted text-xs sm:text-sm mt-0.5">
                  Update your official Telebirr and Commercial Bank of Ethiopia receiving account numbers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paymentMethods.map((method, idx) => (
                  <div
                    key={method.id}
                    className="p-5 rounded-2xl bg-surface-lifted border border-line space-y-4"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-line">
                      <span className="font-heading font-bold text-base text-ink">
                        {method.name}
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-muted">
                        <input
                          type="checkbox"
                          checked={method.enabled === 1}
                          onChange={(e) => {
                            const updated = [...paymentMethods];
                            updated[idx].enabled = e.target.checked ? 1 : 0;
                            setPaymentMethods(updated);
                          }}
                          className="rounded text-accent focus:ring-accent w-4 h-4"
                        />
                        <span>Enabled</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">
                        Account / Phone Number
                      </label>
                      <input
                        type="text"
                        value={method.account_number}
                        onChange={(e) => {
                          const updated = [...paymentMethods];
                          updated[idx].account_number = e.target.value;
                          setPaymentMethods(updated);
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-line bg-bg text-ink font-mono font-bold text-xs sm:text-sm focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">
                        Recipient / Business Name
                      </label>
                      <input
                        type="text"
                        value={method.account_name}
                        onChange={(e) => {
                          const updated = [...paymentMethods];
                          updated[idx].account_name = e.target.value;
                          setPaymentMethods(updated);
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-line bg-bg text-ink text-xs sm:text-sm focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">
                        User Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={method.instructions}
                        onChange={(e) => {
                          const updated = [...paymentMethods];
                          updated[idx].instructions = e.target.value;
                          setPaymentMethods(updated);
                        }}
                        className="w-full p-2.5 rounded-xl border border-line bg-bg text-ink text-xs focus:outline-none focus:border-accent"
                      />
                    </div>

                    <button
                      onClick={() => handleSavePaymentMethod(method)}
                      className="w-full h-10 rounded-xl bg-accent text-on-accent font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 shadow transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Update {method.id.toUpperCase()} Details</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Admin Management */}
            <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line shadow-sm space-y-6">
              <div>
                <h3 className="font-heading font-bold text-xl text-ink flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-accent" />
                  <span>Admin User Management</span>
                </h3>
                <p className="text-muted text-xs sm:text-sm mt-0.5">
                  Grant administrator privileges to authorized team members.
                </p>
              </div>

              {/* Add Admin Form */}
              <form onSubmit={handleAddAdmin} className="p-5 rounded-2xl bg-surface-lifted border border-line space-y-4">
                <h4 className="font-semibold text-sm text-ink">Add New Administrator</h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      placeholder="Solomon Desta"
                      className="w-full h-10 px-3 rounded-xl border border-line bg-bg text-ink text-xs sm:text-sm focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Admin Email</label>
                    <input
                      type="email"
                      required
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="solomon@company.com"
                      className="w-full h-10 px-3 rounded-xl border border-line bg-bg text-ink text-xs sm:text-sm focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 px-3 rounded-xl border border-line bg-bg text-ink text-xs sm:text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addAdminLoading}
                    className="h-10 px-6 rounded-xl bg-accent text-on-accent text-xs font-semibold hover:opacity-90 shadow transition-all disabled:opacity-50"
                  >
                    {addAdminLoading ? "Creating..." : "Create Admin Account"}
                  </button>
                </div>
              </form>

              {/* Current Admins List */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs text-muted uppercase tracking-wider">
                  Current Administrators ({adminsList.length})
                </h4>
                <div className="divide-y divide-line rounded-2xl border border-line bg-surface-lifted overflow-hidden">
                  {adminsList.map((admin) => (
                    <div key={admin.id} className="p-4 flex items-center justify-between text-xs sm:text-sm">
                      <div>
                        <div className="font-bold text-ink">{admin.full_name}</div>
                        <div className="text-muted text-xs font-mono">{admin.email}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-accent/15 text-accent text-xs font-semibold">
                        Admin
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== MODAL: EVIDENCE SCREENSHOT VIEWER ===== */}
      {viewingEvidenceOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-up">
          <div className="w-full max-w-xl bg-surface border border-line rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="font-heading font-bold text-lg text-ink">
                  Payment Evidence Review
                </h3>
                <p className="text-xs text-muted">
                  Order from {viewingEvidenceOrder.customer_name} ({viewingEvidenceOrder.total_amount} {viewingEvidenceOrder.currency})
                </p>
              </div>
              <button
                onClick={() => setViewingEvidenceOrder(null)}
                className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-bg border border-line text-xs font-mono space-y-1">
              <div>Method: <strong className="text-ink">{viewingEvidenceOrder.payment_method}</strong></div>
              <div>Reference ID: <strong className="text-accent">{viewingEvidenceOrder.transaction_reference || "None"}</strong></div>
            </div>

            {/* Display Screenshot */}
            <div className="flex-1 overflow-auto rounded-xl border border-line bg-black/20 flex items-center justify-center min-h-[240px]">
              {viewingEvidenceOrder.evidence_path ? (
                <img
                  src={`/api/admin/orders/${viewingEvidenceOrder.id}/evidence`}
                  alt="Customer Payment Screenshot"
                  className="max-h-[50vh] w-auto object-contain rounded-lg shadow"
                />
              ) : (
                <div className="text-xs text-muted p-8 text-center">
                  No screenshot uploaded. Reference ID was submitted.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setViewingEvidenceOrder(null)}
                className="h-10 px-5 rounded-xl border border-line text-xs font-semibold text-muted hover:text-ink"
              >
                Close
              </button>
              {viewingEvidenceOrder.status === "pending_verification" && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleApprove(viewingEvidenceOrder.id)}
                  className="h-10 px-6 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow"
                >
                  Verify & Release Excel File
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: REJECT REASON ===== */}
      {rejectingOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-up">
          <div className="w-full max-w-md bg-surface border border-line rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-heading font-bold text-lg text-ink">
              Reject Payment Submission
            </h3>
            <p className="text-muted text-xs">
              Provide a clear reason for the customer so they can correct their payment or resubmit valid proof.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <textarea
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Transaction ID not found in CBE Birr / Telebirr account."
                rows={3}
                className="w-full p-3 rounded-xl border border-line bg-bg text-ink text-sm focus:outline-none focus:border-error"
              />

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectingOrder(null)}
                  className="h-10 px-4 rounded-xl border border-line text-xs font-semibold text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-10 px-5 rounded-xl bg-error text-white text-xs font-semibold hover:opacity-90 shadow"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
