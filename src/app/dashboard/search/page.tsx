"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
    Search, ChevronDown, Save, History, Download, X, Loader2,
    FileText, AlertTriangle, Clock, Wrench, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ────────────────────────────────────────────────────
interface Equipment {
    ISID: string; ACCN: string; SERN: string; MODL: string;
    NAEM_SUP: string; NAEM: string; MNFC: string; CUST: string;
    MEMO: string; ACC1: string; TYEP: string; MODE_CODE: string;
    TERM: string; LAST: string; NEXT: string; STAT: string; EMID: string;
    MANUFACTURER_NAME: string; CUSTOMER_NAME: string; ENGINEER_NAME: string;
    STATUS_NAME: string; LATEST_CALNO: string;
}

interface LookupItem { CODE: string; NAME: string; }
interface CalHistory { CIDU: string; CARD: string; LOCT: string; KOLAS_NO: string; CALNO_EXT: string; EMID: string; }

type SearchMode = "regNo" | "asset" | "sn" | "calNo" | "model" | "ongoing" | "expirations";
type SearchType = "regNo" | "asset" | "sn";

// ── Helpers ──────────────────────────────────────────────────
const formatDate = (d: string) => {
    if (!d || d === "0") return "—";
    if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    return d;
};

// ── Component ────────────────────────────────────────────────
export default function SearchPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const role = (session?.user as any)?.role;
    const isMaster = role === "MASTER";

    // Search state
    const [activeTab, setActiveTab] = useState<SearchMode>("regNo");
    const [searchType, setSearchType] = useState<SearchType>("regNo");
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);

    // Results
    const [results, setResults] = useState<Equipment[]>([]);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [editData, setEditData] = useState<Partial<Equipment>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Lookups
    const [lookups, setLookups] = useState<{
        types: LookupItem[]; modes: LookupItem[]; statuses: LookupItem[];
        suppliers: LookupItem[]; employees: LookupItem[];
    } | null>(null);

    // Modals
    const [showSelectModal, setShowSelectModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [calHistory, setCalHistory] = useState<CalHistory[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // ── Auth Guard ───────────────────────────────────────────
    useEffect(() => {
        if (status === "unauthenticated") router.push("/auth/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated" && role === "USER") {
            router.push("/dashboard");
        }
    }, [status, role, router]);

    // ── Load Lookups ─────────────────────────────────────────
    useEffect(() => {
        fetch("/api/search?mode=lookups")
            .then(r => r.json())
            .then(setLookups)
            .catch(() => toast.error("Failed to load lookup data"));
    }, []);

    // ── Read URL tab parameter ───────────────────────────────
    useEffect(() => {
        const tabParam = searchParams.get("tab") as SearchMode | null;
        if (tabParam && ["regNo", "calNo", "model", "ongoing", "expirations"].includes(tabParam)) {
            setActiveTab(tabParam);
            setSearchQuery("");
            setSelectedEquipment(null);
            setResults([]);
            if (tabParam === "ongoing" || tabParam === "expirations") {
                setTimeout(() => handleSearch(tabParam, ""), 100);
            }
        }
    }, [searchParams]);

    // ── Search Handler ───────────────────────────────────────
    const handleSearch = useCallback(async (mode?: SearchMode, query?: string) => {
        const m = mode || activeTab;
        const q = query !== undefined ? query : searchQuery;

        if (["regNo", "asset", "sn", "calNo", "model"].includes(m) && !q.trim()) {
            toast.error("검색어를 입력하세요");
            return;
        }

        setIsSearching(true);
        setSelectedEquipment(null);
        setResults([]);

        try {
            const searchMode = m === "regNo" || m === "asset" || m === "sn" ? m : m;
            const res = await fetch(`/api/search?mode=${searchMode}&q=${encodeURIComponent(q)}`);
            if (!res.ok) throw new Error("Search failed");

            const data: Equipment[] = await res.json();

            if (data.length === 0) {
                toast.info("검색 결과가 없습니다");
            } else if (data.length === 1) {
                selectEquipment(data[0]);
                setResults(data);
            } else {
                setResults(data);
                if (["asset", "sn", "model", "ongoing", "expirations"].includes(m)) {
                    setShowSelectModal(true);
                } else {
                    selectEquipment(data[0]);
                }
            }
        } catch {
            toast.error("검색 중 오류가 발생했습니다");
        } finally {
            setIsSearching(false);
        }
    }, [activeTab, searchQuery]);

    // ── Select Equipment ─────────────────────────────────────
    const selectEquipment = (eq: Equipment) => {
        setSelectedEquipment(eq);
        setEditData({ ...eq });
        setShowSelectModal(false);
    };

    // ── Save Handler ─────────────────────────────────────────
    const handleSave = async () => {
        if (!selectedEquipment) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/search", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    isid: selectedEquipment.ISID,
                    naemSup: editData.NAEM_SUP,
                    accn: editData.ACCN,
                    sern: editData.SERN,
                    memo: editData.MEMO,
                    acc1: editData.ACC1,
                    tyep: editData.TYEP,
                    modeCode: editData.MODE_CODE,
                    term: editData.TERM,
                    cust: editData.CUST,
                    last: isMaster ? editData.LAST : undefined,
                    next: isMaster ? editData.NEXT : undefined,
                }),
            });
            if (!res.ok) throw new Error();
            toast.success("저장 완료");
            // Refresh the selected equipment
            await handleSearch("regNo", selectedEquipment.ISID);
        } catch {
            toast.error("저장 중 오류가 발생했습니다");
        } finally {
            setIsSaving(false);
        }
    };

    // ── Cal History Handler ──────────────────────────────────
    const openCalHistory = async () => {
        if (!selectedEquipment) return;
        setIsLoadingHistory(true);
        setShowHistoryModal(true);
        try {
            const res = await fetch(`/api/search?mode=calHistory&isid=${selectedEquipment.ISID}`);
            const data = await res.json();
            setCalHistory(data);
        } catch {
            toast.error("교정 이력 로딩 실패");
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // ── Cal Report Download ──────────────────────────────────
    const downloadReport = async (calNo: string) => {
        const loadingToast = toast.loading("Downloading report...");
        try {
            // Use existing equipment download API with report type
            const res = await fetch(`/api/equipment/download?id=${selectedEquipment?.ISID}&type=report`);
            if (!res.ok) {
                toast.error("성적서 파일을 찾을 수 없습니다", { id: loadingToast });
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${calNo}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("다운로드 완료", { id: loadingToast });
        } catch {
            toast.error("다운로드 실패", { id: loadingToast });
        }
    };

    // ── Tab change ───────────────────────────────────────────
    const handleTabChange = (tab: SearchMode) => {
        setActiveTab(tab);
        setSearchQuery("");
        setSelectedEquipment(null);
        setResults([]);
        if (tab === "regNo") setSearchType("regNo");

        // Auto-search for list tabs
        if (tab === "ongoing" || tab === "expirations") {
            setTimeout(() => handleSearch(tab, ""), 0);
        }
    };

    // ── Update edit field ────────────────────────────────────
    const updateField = (key: string, value: string) => {
        setEditData(prev => ({ ...prev, [key]: value }));
    };

    if (status === "loading") return null;

    const tabs: { key: SearchMode; label: string; icon: any }[] = [
        { key: "regNo", label: "REG NO", icon: Search },
        { key: "calNo", label: "CAL NO", icon: FileText },
        { key: "model", label: "MODEL", icon: Wrench },
        { key: "ongoing", label: "ON-GOING", icon: Clock },
        { key: "expirations", label: "EXPIRATIONS", icon: AlertTriangle },
    ];

    const searchTypeLabels: Record<SearchType, string> = {
        regNo: "REG NO",
        asset: "ASSET",
        sn: "S/N",
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* ── Header ──────────────────────────────────── */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-l-4 border-[#001489] pl-4 md:pl-8">
                <div>
                    <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 leading-tight mb-2">
                        <span className="text-[#001489]">Search</span>
                    </h2>
                </div>
            </div>

            {/* ── Category Tabs ───────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-100 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            className={`flex items-center gap-2 px-5 py-3.5 text-[10px] md:text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${activeTab === tab.key
                                ? "border-[#001489] text-[#001489] bg-[#001489]/5"
                                : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Search Bar ──────────────────────────── */}
                {["regNo", "calNo", "model"].includes(activeTab) && (
                    <div className="p-4 md:p-6 bg-gradient-to-r from-slate-50 to-white">
                        <div className="flex items-center gap-3 max-w-2xl">
                            {/* Type Dropdown (only for REG NO tab) */}
                            {activeTab === "regNo" && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-700 hover:border-[#001489] transition-colors min-w-[100px]"
                                    >
                                        {searchTypeLabels[searchType]}
                                        <ChevronDown className="w-3 h-3 text-slate-400" />
                                    </button>
                                    {showTypeDropdown && (
                                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[120px]">
                                            {(Object.keys(searchTypeLabels) as SearchType[]).map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => { setSearchType(t); setShowTypeDropdown(false); }}
                                                    className={`w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${searchType === t ? "bg-[#001489] text-white" : "text-slate-600 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    {searchTypeLabels[t]}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Search Input */}
                            <div className="flex-1 relative">
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            const mode = activeTab === "regNo" ? searchType : activeTab;
                                            handleSearch(mode as SearchMode);
                                        }
                                    }}
                                    placeholder={
                                        activeTab === "regNo"
                                            ? `Search by ${searchTypeLabels[searchType]}...`
                                            : activeTab === "calNo"
                                                ? "Enter CAL NO..."
                                                : "Enter Model Name..."
                                    }
                                    className="h-11 rounded-xl border-slate-200 bg-white text-sm font-medium placeholder:text-slate-300 focus-visible:ring-[#001489]"
                                />
                            </div>

                            {/* Search Button */}
                            <Button
                                onClick={() => {
                                    const mode = activeTab === "regNo" ? searchType : activeTab;
                                    handleSearch(mode as SearchMode);
                                }}
                                disabled={isSearching}
                                className="h-11 px-6 bg-[#001489] hover:bg-[#001489]/90 rounded-xl text-[11px] font-black uppercase tracking-widest"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Loading for auto-search tabs */}
                {isSearching && (activeTab === "ongoing" || activeTab === "expirations") && (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#001489]" />
                    </div>
                )}
            </div>

            {/* ── Results List (for list modes or multi-result) ─ */}
            {results.length > 1 && !showSelectModal && selectedEquipment && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Search Results — {results.length} records
                        </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {results.map((eq) => (
                            <button
                                key={eq.ISID}
                                onClick={() => selectEquipment(eq)}
                                className={`w-full flex items-center justify-between px-5 py-3 border-b border-slate-50 text-left transition-all hover:bg-slate-50 ${selectedEquipment?.ISID === eq.ISID ? "bg-[#001489]/5 border-l-2 border-l-[#001489]" : ""
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-black text-[#001489] min-w-[80px]">{eq.ISID}</span>
                                    <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]">{eq.NAEM_SUP || eq.NAEM}</span>
                                    <span className="text-[10px] text-slate-400">{eq.MODL}</span>
                                </div>
                                <ChevronRight className="w-3 h-3 text-slate-300" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Equipment Detail Card ──────────────────── */}
            {selectedEquipment && editData && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-slate-100 bg-gradient-to-r from-[#001489]/5 to-transparent flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Equipment Detail</p>
                            <h3 className="text-lg font-black text-slate-900">{selectedEquipment.NAEM_SUP || selectedEquipment.NAEM || "—"}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={openCalHistory}
                                variant="outline"
                                className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider border-slate-200 hover:border-[#001489] hover:text-[#001489]"
                            >
                                <History className="w-3.5 h-3.5 mr-1.5" />
                                Cal History
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="h-9 px-5 bg-[#001489] hover:bg-[#001489]/90 rounded-xl text-[10px] font-black uppercase tracking-wider"
                            >
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                Save
                            </Button>
                        </div>
                    </div>

                    <div className="p-5 md:p-6 space-y-6">
                        {/* Row 1: Customer / REG NO / Latest CAL NO */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldCombo
                                label="Customer Name"
                                value={editData.CUST || ""}
                                displayValue={lookups?.suppliers?.find(s => s.CODE === editData.CUST)?.NAME || editData.CUSTOMER_NAME || ""}
                                options={lookups?.suppliers || []}
                                onChange={(v) => updateField("CUST", v)}
                            />
                            <FieldReadOnly label="REG NO" value={selectedEquipment.ISID} highlight />
                            <FieldReadOnly label="Latest CAL NO" value={selectedEquipment.LATEST_CALNO} />
                        </div>

                        <div className="border-t border-slate-100" />

                        {/* Row 2: Equipment Name / Master Name / Model / Manufacturer */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldEditable label="Equipment Name" value={editData.NAEM_SUP || ""} onChange={(v) => updateField("NAEM_SUP", v)} />
                            <FieldReadOnly label="Master Name" value={selectedEquipment.NAEM} />
                            <FieldReadOnly label="Model Name" value={selectedEquipment.MODL} />
                            <FieldReadOnly label="Manufacturer" value={`${selectedEquipment.MNFC || ""} ${selectedEquipment.MANUFACTURER_NAME ? `(${selectedEquipment.MANUFACTURER_NAME})` : ""}`} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldEditable label="Asset No" value={editData.ACCN || ""} onChange={(v) => updateField("ACCN", v)} />
                            <FieldEditable label="Serial No" value={editData.SERN || ""} onChange={(v) => updateField("SERN", v)} />
                        </div>

                        <div className="border-t border-slate-100" />

                        {/* Row 3: MEMO / ACC */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldEditable label="MEMO" value={editData.MEMO || ""} onChange={(v) => updateField("MEMO", v)} multiline />
                            <FieldEditable label="ACC" value={editData.ACC1 || ""} onChange={(v) => updateField("ACC1", v)} />
                        </div>

                        <div className="border-t border-slate-100" />

                        {/* Row 4: Management / Equipment Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldCombo
                                label="Management"
                                value={editData.TYEP || ""}
                                displayValue={lookups?.types?.find(t => t.CODE === editData.TYEP)?.NAME || ""}
                                options={lookups?.types || []}
                                onChange={(v) => updateField("TYEP", v)}
                            />
                            <FieldCombo
                                label="Equipment Status"
                                value={editData.MODE_CODE || ""}
                                displayValue={lookups?.modes?.find(m => m.CODE === editData.MODE_CODE)?.NAME || ""}
                                options={lookups?.modes || []}
                                onChange={(v) => updateField("MODE_CODE", v)}
                            />
                        </div>

                        <div className="border-t border-slate-100" />

                        {/* Row 5: Cal info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldEditable label="Calibration Interval" value={editData.TERM || ""} onChange={(v) => updateField("TERM", v)} />
                            {isMaster ? (
                                <>
                                    <FieldEditable label="Latest Cal Date" value={editData.LAST || ""} onChange={(v) => updateField("LAST", v)} masterOnly />
                                    <FieldEditable label="Next Cal Date" value={editData.NEXT || ""} onChange={(v) => updateField("NEXT", v)} masterOnly />
                                </>
                            ) : (
                                <>
                                    <FieldReadOnly label="Latest Cal Date" value={formatDate(selectedEquipment.LAST)} />
                                    <FieldReadOnly label="Next Cal Date" value={formatDate(selectedEquipment.NEXT)} />
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldReadOnly label="Latest Engineer" value={`${selectedEquipment.EMID || ""} ${selectedEquipment.ENGINEER_NAME ? `(${selectedEquipment.ENGINEER_NAME})` : ""}`} />
                            <FieldReadOnly label="Status" value={`${selectedEquipment.STAT || ""} ${selectedEquipment.STATUS_NAME ? `(${selectedEquipment.STATUS_NAME})` : ""}`} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Selection Modal ─────────────────────────── */}
            {showSelectModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSelectModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Multiple Results</p>
                                <h3 className="text-base font-black text-slate-900">{results.length}건의 결과가 있습니다. 선택해주세요.</h3>
                            </div>
                            <button onClick={() => setShowSelectModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="overflow-y-auto max-h-[60vh] custom-scrollbar">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">REG NO</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Equipment</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Model</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">S/N</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((eq) => (
                                        <tr
                                            key={eq.ISID}
                                            onClick={() => selectEquipment(eq)}
                                            className="border-b border-slate-50 hover:bg-[#001489]/5 cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-3 font-black text-[#001489]">{eq.ISID}</td>
                                            <td className="px-4 py-3 font-medium text-slate-700 truncate max-w-[200px]">{eq.NAEM_SUP || eq.NAEM}</td>
                                            <td className="px-4 py-3 text-slate-500">{eq.MODL}</td>
                                            <td className="px-4 py-3 text-slate-500">{eq.SERN}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Calibration History Modal ───────────────── */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowHistoryModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Calibration History</p>
                                <h3 className="text-base font-black text-slate-900">REG NO: {selectedEquipment?.ISID}</h3>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="overflow-y-auto max-h-[60vh] custom-scrollbar">
                            {isLoadingHistory ? (
                                <div className="flex items-center justify-center p-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#001489]" />
                                </div>
                            ) : calHistory.length === 0 ? (
                                <div className="flex items-center justify-center p-12 text-slate-400">
                                    <p className="text-sm font-medium">교정 이력이 없습니다</p>
                                </div>
                            ) : (
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">CAL NO</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Cal Date</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Location</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Report No</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Report</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {calHistory.map((h, i) => (
                                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                                <td className="px-4 py-3 font-black text-[#001489]">{h.CIDU}</td>
                                                <td className="px-4 py-3 font-medium text-slate-700">{formatDate(h.CARD)}</td>
                                                <td className="px-4 py-3 text-slate-500">{h.LOCT || "—"}</td>
                                                <td className="px-4 py-3 text-slate-500">{h.KOLAS_NO || h.CALNO_EXT || "—"}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => downloadReport(h.CIDU)}
                                                        className="h-7 px-3 text-[10px] font-black uppercase tracking-wider text-[#001489] hover:bg-[#001489]/10 rounded-lg"
                                                    >
                                                        <Download className="w-3 h-3 mr-1" />
                                                        PDF
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sub-Components ───────────────────────────────────────────

function FieldReadOnly({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
            <div className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${highlight
                ? "bg-[#001489]/5 border-[#001489]/20 text-[#001489] font-black"
                : "bg-slate-50 border-slate-100 text-slate-600"
                }`}>
                {value || "—"}
            </div>
        </div>
    );
}

function FieldEditable({ label, value, onChange, multiline, masterOnly }: {
    label: string; value: string; onChange: (v: string) => void; multiline?: boolean; masterOnly?: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
                {masterOnly && (
                    <span className="text-[8px] font-black uppercase tracking-wider text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">Master</span>
                )}
            </div>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#001489]/20 focus:border-[#001489] transition-all resize-none"
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#001489]/20 focus:border-[#001489] transition-all"
                />
            )}
        </div>
    );
}

function FieldCombo({ label, value, displayValue, options, onChange }: {
    label: string; value: string; displayValue: string;
    options: LookupItem[]; onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState("");

    const filtered = options.filter(o =>
        o.NAME?.toLowerCase().includes(filter.toLowerCase()) ||
        o.CODE?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-1.5 relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
            <button
                onClick={() => { setOpen(!open); setFilter(""); }}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white hover:border-[#001489] transition-all text-left"
            >
                <span className="truncate">{displayValue || value || "—"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
            </button>
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <input
                            autoFocus
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Filter..."
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-100 focus:outline-none focus:ring-1 focus:ring-[#001489]"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {filtered.slice(0, 50).map(o => (
                            <button
                                key={o.CODE}
                                onClick={() => { onChange(o.CODE); setOpen(false); }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium hover:bg-slate-50 transition-colors text-left ${value === o.CODE ? "bg-[#001489]/5 text-[#001489] font-bold" : "text-slate-600"
                                    }`}
                            >
                                <span className="truncate">{o.NAME || o.CODE}</span>
                                <span className="text-[9px] text-slate-400 ml-2 shrink-0">{o.CODE}</span>
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <p className="px-4 py-3 text-xs text-slate-400 text-center">No results</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
