"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, Key, Activity, Trash2, Edit, UserCheck, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-client";
import { useMessageDialog } from "@/components/ui/message-dialog";

export default function AccountsPage() {
    const { data: session } = useAuth();
    const { confirm, MessageDialog } = useMessageDialog();
    const router = useRouter();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isRequestsOpen, setIsRequestsOpen] = useState(true);
    const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
    const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
    const [approvalData, setApprovalData] = useState<Record<string, any>>({});
    const [customerResults, setCustomerResults] = useState<Record<string, any[]>>({});
    const [customerSearchLoading, setCustomerSearchLoading] = useState<Record<string, boolean>>({});

    // Registration Form State
    const [formData, setFormData] = useState({
        userId: "",
        password: "",
        userName: "",
        corpId: "",
        corpName: "",
        authority: "U", // Default to User
        corpType: ""
    });

    const isMaster = (session?.user as any)?.role === "MASTER";

    useEffect(() => {
        if (session && !isMaster) {
            router.push("/dashboard");
        }
        fetchAccounts();
    }, [session]);

    const fetchAccounts = async () => {
        setIsLoading(true);
        try {
            const [accountsRes, requestsRes] = await Promise.all([
                apiFetch("/api/accounts"),
                apiFetch("/api/account-requests"),
            ]);
            if (accountsRes.ok) {
                const data = await accountsRes.json();
                setAccounts(data);
            }
            if (requestsRes.ok) {
                const data = await requestsRes.json();
                setRequests(data);
            }
        } catch (error) {
            console.error("Fetch Accounts Error:", error);
            toast.error("Failed to load accounts.");
        } finally {
            setIsLoading(false);
        }
    };

    const updateApproval = (userId: string, field: string, value: string) => {
        setApprovalData({
            ...approvalData,
            [userId]: {
                ...(approvalData[userId] || {}),
                [field]: value,
            },
        });
    };

    const searchCustomers = async (userId: string, q: string) => {
        updateApproval(userId, "customerSearch", q);
        if (q.trim().length < 2) {
            setCustomerResults({ ...customerResults, [userId]: [] });
            return;
        }

        setCustomerSearchLoading({ ...customerSearchLoading, [userId]: true });
        try {
            const res = await apiFetch(`/api/account-requests/customers?q=${encodeURIComponent(q.trim())}`);
            if (!res.ok) {
                throw new Error("Customer search failed.");
            }
            const data = await res.json();
            setCustomerResults({ ...customerResults, [userId]: data });
        } catch (error) {
            toast.error("Customer search failed", {
                description: error instanceof Error ? error.message : "Unable to search TBSUPMAN.",
            });
        } finally {
            setCustomerSearchLoading({ ...customerSearchLoading, [userId]: false });
        }
    };

    const selectCustomer = (userId: string, customer: any) => {
        setApprovalData({
            ...approvalData,
            [userId]: {
                ...(approvalData[userId] || {}),
                corpId: customer.CORP_ID,
                corpName: customer.CORP_NAME,
                customerSearch: customer.CORP_NAME,
            },
        });
        setCustomerResults({ ...customerResults, [userId]: [] });
    };

    const handleApproveRequest = async (request: any) => {
        const current = approvalData[request.USERID] || {};
        const corpName = current.corpName || "";
        if (!current.corpId || !corpName) {
            toast.error("Select a customer from TBSUPMAN before approving.");
            return;
        }

        const confirmed = await confirm({
            title: "Approve Access Request",
            description: `Approve ${request.USERID} and assign this account to [${current.corpId}] ${corpName}?`,
            confirmText: "Approve",
            variant: "warning",
        });
        if (!confirmed) return;

        setApprovingUserId(request.USERID);
        const loadingToast = toast.loading("Approving access request...");
        try {
            const res = await apiFetch("/api/account-requests/approve", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: request.USERID,
                    corpId: current.corpId,
                    corpName,
                    authority: current.authority || "U",
                    corpType: current.corpType || "C",
                }),
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.detail || "Approval failed.");
            }
            toast.success("Access request approved.", { id: loadingToast });
            fetchAccounts();
        } catch (error) {
            toast.error("Approval failed", {
                description: error instanceof Error ? error.message : "Unable to approve access request.",
                id: loadingToast,
            });
        } finally {
            setApprovingUserId(null);
        }
    };

    const handleRejectRequest = async (request: any) => {
        const confirmed = await confirm({
            title: "Reject Access Request",
            description: `Reject ${request.USERID}? This will permanently delete the pending request data.`,
            confirmText: "Reject",
            variant: "warning",
        });
        if (!confirmed) return;

        setRejectingUserId(request.USERID);
        const loadingToast = toast.loading("Rejecting access request...");
        try {
            const res = await apiFetch("/api/account-requests/reject", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: request.USERID }),
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.detail || "Rejection failed.");
            }
            toast.success("Access request rejected.", { id: loadingToast });
            fetchAccounts();
        } catch (error) {
            toast.error("Rejection failed", {
                description: error instanceof Error ? error.message : "Unable to reject access request.",
                id: loadingToast,
            });
        } finally {
            setRejectingUserId(null);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const loadingToast = toast.loading("Registering new encrypted profile...");

        try {
            const res = await apiFetch("/api/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success("Account successfully indexed.", { id: loadingToast });
                setIsRegisterOpen(false);
                fetchAccounts();
                setFormData({ userId: "", password: "", userName: "", corpId: "", corpName: "", authority: "U", corpType: "" });
            } else {
                const error = await res.json();
                toast.error("Registration failed", { description: error.error, id: loadingToast });
            }
        } catch (error) {
            toast.error("Network synchronization error", { id: loadingToast });
        }
    };

    const getRoleBadge = (authority: string, corpType: string) => {
        const auth = (authority || "").trim().toUpperCase();
        const ct = (corpType || "").trim().toUpperCase();

        if (ct === "H") {
            if (auth === "A") return <Badge className="bg-[#001489] text-white">MASTER</Badge>;
            if (auth === "U") return <Badge className="bg-emerald-500 text-white">EMPLOYEE</Badge>;
        }
        return <Badge variant="outline" className="text-slate-400">USER</Badge>;
    };

    const filteredAccounts = accounts.filter(acc =>
        (acc.USERNAME || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.USERID || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.CORPNAME || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {MessageDialog}
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-l-4 border-[#001489] pl-4 md:pl-8">
                <div>
                    <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 leading-tight mb-2">
                        Account <span className="text-[#001489]">Hierarchy Manager</span>
                    </h2>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400">
                        Protocol: <span className="text-slate-900 uppercase font-black">CUSTCAL.TWUSRMAN-V4</span>
                    </p>
                </div>
                <div className="flex items-center">
                    <Button
                        className="w-full md:w-auto bg-slate-900 hover:bg-black text-white rounded-xl h-10 md:h-12 px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-900/10 flex items-center justify-center space-x-3 transition-all active:scale-95"
                        onClick={() => setIsRegisterOpen(!isRegisterOpen)}
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>{isRegisterOpen ? "Cancel Entry" : "Register Access"}</span>
                    </Button>
                </div>
            </div>

            {/* Registration Panel (Collapsible) */}
            {isRegisterOpen && (
                <Card className="border-none shadow-2xl shadow-blue-900/5 bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <CardHeader className="bg-[#001489]/5 p-6 md:p-8 border-b border-[#001489]/5">
                        <div className="flex items-center space-x-3">
                            <Key className="w-5 h-5 text-[#001489]" />
                            <CardTitle className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-slate-400">Index New Profile</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 md:p-8">
                        <form onSubmit={handleRegisterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Login ID</label>
                                <Input
                                    className="h-10 md:h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] transition-all font-bold text-slate-900 text-sm"
                                    value={formData.userId}
                                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secure Password</label>
                                <Input
                                    type="password"
                                    className="h-10 md:h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] transition-all font-bold text-slate-900 text-sm"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Identity</label>
                                <Input
                                    className="h-10 md:h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] transition-all font-bold text-slate-900 text-sm"
                                    value={formData.userName}
                                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Corporation ID</label>
                                <Input
                                    className="h-10 md:h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] transition-all font-bold text-slate-900 text-sm"
                                    value={formData.corpId}
                                    onChange={(e) => setFormData({ ...formData, corpId: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Corporation Label</label>
                                <Input
                                    className="h-10 md:h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] transition-all font-bold text-slate-900 text-sm"
                                    value={formData.corpName}
                                    onChange={(e) => setFormData({ ...formData, corpName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Authority Clearance</label>
                                <Select onValueChange={(v: string) => setFormData({ ...formData, authority: v })} defaultValue="U">
                                    <SelectTrigger className="h-10 md:h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] font-bold text-slate-900 text-sm">
                                        <SelectValue placeholder="Select Clearance" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                        <SelectItem value="U" className="font-bold">U - Standard/Employee</SelectItem>
                                        <SelectItem value="A" className="font-bold">A - Administrative/Master</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Entity Classification</label>
                                <Select onValueChange={(v: string) => setFormData({ ...formData, corpType: v })}>
                                    <SelectTrigger className="h-10 md:h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] font-bold text-slate-900 text-sm">
                                        <SelectValue placeholder="Classification" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                        <SelectItem value="H" className="font-bold">H - HCT Native (HQ)</SelectItem>
                                        <SelectItem value="C" className="font-bold">C - Client Internal</SelectItem>
                                        <SelectItem value="" className="font-bold">Empty - External Partner</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="sm:col-span-2 lg:col-span-1 pt-4 md:pt-5">
                                <Button type="submit" className="w-full h-10 md:h-12 bg-[#001489] hover:bg-blue-800 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-900/10 transition-all">
                                    Authorize Entry
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {requests.length > 0 && (
                <Card className="border-none shadow-2xl shadow-blue-900/5 bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden">
                    <CardHeader
                        className="bg-amber-50/70 p-6 md:p-8 border-b border-amber-100 cursor-pointer"
                        onClick={() => setIsRequestsOpen(!isRequestsOpen)}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <UserCheck className="w-5 h-5 text-amber-600" />
                                <CardTitle className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-amber-700">Pending Access Requests</CardTitle>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge className="bg-amber-600 text-white">{requests.length}</Badge>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-amber-700 hover:bg-amber-100"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setIsRequestsOpen(!isRequestsOpen);
                                    }}
                                >
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isRequestsOpen ? "rotate-180" : ""}`} />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    {isRequestsOpen && <CardContent className="p-0">
                        <div className="overflow-x-auto custom-scrollbar">
                            <Table className="min-w-[1100px]">
                                <TableHeader>
                                    <TableRow className="border-b border-slate-50 hover:bg-transparent">
                                        <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Requester</TableHead>
                                        <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Company</TableHead>
                                        <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Match</TableHead>
                                        <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</TableHead>
                                        <TableHead className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((request) => (
                                        <TableRow key={request.USERID} className="border-b border-slate-50 align-top">
                                            <TableCell className="px-6 py-4">
                                                <p className="text-xs font-black text-slate-900">{request.USERNAME || "---"}</p>
                                                <p className="mt-1 text-[10px] font-bold text-[#001489]">{request.USERID}</p>
                                                <p className="mt-1 text-[10px] font-bold text-slate-400">{request.EMAIL || "---"}</p>
                                                <p className="mt-1 text-[10px] font-bold text-slate-400">{request.TELNO || "Phone N/A"}</p>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <p className="text-xs font-black uppercase text-slate-900">{request.CORPNAME || "---"}</p>
                                                <p className="mt-1 max-w-[280px] text-[10px] font-semibold leading-relaxed text-slate-400">{request.CORPADDRESS || "---"}</p>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <div className="relative min-w-[320px] space-y-2">
                                                    <Input
                                                        placeholder="Search TBSUPMAN by customer name or ID"
                                                        className="h-9 rounded-lg border-slate-100 bg-slate-50 text-xs font-bold"
                                                        value={approvalData[request.USERID]?.customerSearch || ""}
                                                        onChange={(e) => searchCustomers(request.USERID, e.target.value)}
                                                    />
                                                    {approvalData[request.USERID]?.corpId && (
                                                        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                                                Selected Customer
                                                            </p>
                                                            <p className="mt-1 text-xs font-black text-slate-900">
                                                                [{approvalData[request.USERID].corpId}] {approvalData[request.USERID].corpName}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {customerSearchLoading[request.USERID] && (
                                                        <p className="text-[10px] font-bold text-slate-400">Searching TBSUPMAN...</p>
                                                    )}
                                                    {(customerResults[request.USERID] || []).length > 0 && (
                                                        <div className="absolute left-0 right-0 top-10 z-30 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-2xl">
                                                            {customerResults[request.USERID].map((customer) => (
                                                                <button
                                                                    key={customer.CORP_ID}
                                                                    type="button"
                                                                    className="w-full px-3 py-2 text-left hover:bg-[#001489]/5"
                                                                    onClick={() => selectCustomer(request.USERID, customer)}
                                                                >
                                                                    <p className="text-xs font-black text-slate-900">{customer.CORP_NAME}</p>
                                                                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#001489]">ID: {customer.CORP_ID}</p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <div className="grid min-w-[260px] grid-cols-2 gap-2">
                                                    <Select value={approvalData[request.USERID]?.authority || "U"} onValueChange={(v) => updateApproval(request.USERID, "authority", v)}>
                                                        <SelectTrigger className="h-9 rounded-lg border-slate-100 bg-slate-50 text-xs font-bold">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="U">U - Standard User</SelectItem>
                                                            <SelectItem value="A">A - Administrator</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Select value={approvalData[request.USERID]?.corpType || "C"} onValueChange={(v) => updateApproval(request.USERID, "corpType", v)}>
                                                        <SelectTrigger className="h-9 rounded-lg border-slate-100 bg-slate-50 text-xs font-bold">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="C">C - Customer Company</SelectItem>
                                                            <SelectItem value="H">H - HCT Internal</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="h-9 rounded-lg border-rose-100 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50"
                                                        disabled={rejectingUserId === request.USERID || approvingUserId === request.USERID}
                                                        onClick={() => handleRejectRequest(request)}
                                                    >
                                                        {rejectingUserId === request.USERID ? "Rejecting..." : "Reject"}
                                                    </Button>
                                                    <Button
                                                        className="h-9 rounded-lg bg-[#001489] px-4 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#000e62]"
                                                        disabled={approvingUserId === request.USERID || rejectingUserId === request.USERID}
                                                        onClick={() => handleApproveRequest(request)}
                                                    >
                                                        {approvingUserId === request.USERID ? "Approving..." : "Approve"}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>}
                </Card>
            )}

            {/* Account Registry Table */}
            <Card className="border-none shadow-2xl shadow-blue-900/5 bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-white p-6 md:p-8 pb-4 flex flex-col xl:flex-row xl:items-center justify-between gap-6 md:gap-8">
                    <div className="flex items-center space-x-3">
                        <Activity className="w-5 h-5 text-[#001489]" />
                        <CardTitle className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-slate-400">Encrypted Registry</CardTitle>
                    </div>
                    <div className="relative w-full md:max-w-md group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#001489] transition-colors" />
                        <Input
                            placeholder="Identify subject..."
                            className="h-10 md:h-12 pl-14 pr-6 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] transition-all font-bold text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto custom-scrollbar">
                        <Table className="min-w-[800px] md:min-w-full">
                            <TableHeader>
                                <TableRow className="border-b border-slate-50 hover:bg-transparent">
                                    <TableHead className="text-[10px] font-black py-4 md:py-6 text-slate-400 uppercase tracking-widest px-6 md:px-8">Authority</TableHead>
                                    <TableHead className="text-[10px] font-black py-4 md:py-6 text-slate-400 uppercase tracking-widest px-6 md:px-8">Identity</TableHead>
                                    <TableHead className="text-[10px] font-black py-4 md:py-6 text-slate-400 uppercase tracking-widest px-6 md:px-8">Login ID</TableHead>
                                    <TableHead className="text-[10px] font-black py-4 md:py-6 text-slate-400 uppercase tracking-widest px-6 md:px-8">Corporation</TableHead>
                                    <TableHead className="text-[10px] font-black py-4 md:py-6 text-slate-400 uppercase tracking-widest px-6 md:px-8 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-[#001489] animate-spin" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">Syncing Matrix...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredAccounts.length > 0 ? (
                                    filteredAccounts.map((acc) => (
                                        <TableRow key={acc.USERID} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="px-6 md:px-8 py-4 md:py-5">
                                                {getRoleBadge(acc.AUTHORITY, acc.CORPTYPE)}
                                            </TableCell>
                                            <TableCell className="px-6 md:px-8 py-4 md:py-5">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-[10px] font-black">
                                                        {(acc.USERNAME || "U")[0]}
                                                    </div>
                                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{acc.USERNAME}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 md:px-8 py-4 md:py-5">
                                                <p className="text-xs font-bold text-[#001489]">{acc.USERID}</p>
                                            </TableCell>
                                            <TableCell className="px-6 md:px-8 py-4 md:py-5">
                                                <div className="flex flex-col">
                                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{acc.CORPNAME || "---"}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{acc.CORPID || "NONE"}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 md:px-8 py-4 md:py-5 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-300 hover:text-[#001489] hover:bg-[#001489]/5 transition-all">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center">
                                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">No identities found in current node</p>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
