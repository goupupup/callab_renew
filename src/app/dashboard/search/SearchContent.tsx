"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { toast } from "sonner";
import {
    Search, ChevronDown, Save, History, Download, X, Loader2,
    FileText, AlertTriangle, Clock, Wrench, ChevronRight, Activity, Database
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

export type SearchMode = "regNo" | "asset" | "sn" | "calNo" | "model" | "ongoing" | "expirations";
type SearchType = "regNo" | "asset" | "sn";

const formatDate = (d: string) => {
    if (!d || d === "0" || d === "00000000") return "—";
    const cleanD = d.toString().trim();
    if (cleanD.length === 8) {
        const year = cleanD.slice(0, 4);
        const monthIdx = parseInt(cleanD.slice(4, 6)) - 1;
        const day = cleanD.slice(6, 8);
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        if (monthIdx >= 0 && monthIdx < 12) {
            return `${months[monthIdx]}-${day}-${year}`;
        }
    }
    return d;
};

const parseDate = (val: string | undefined): string => {
    if (!val) return "";
    const clean = val.trim().toUpperCase();
    if (/^\d{8}$/.test(clean)) return clean;
    const months: Record<string, string> = {
        JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
        JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
    };
    const parts = clean.split("-");
    if (parts.length === 3) {
        const m = months[parts[0]];
        const d = parts[1].padStart(2, '0');
        const y = parts[2];
        if (m && d && y.length === 4) return `${y}${m}${d}`;
    }
    return clean;
};

interface SearchContentProps {
    defaultTab: SearchMode;
}

export default function SearchContent({ defaultTab }: SearchContentProps) {
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#001489]" /></div>}>
            <SearchInner defaultTab={defaultTab} />
        </Suspense>
    );
}

function SearchInner({ defaultTab }: SearchContentProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const role = (session?.user as any)?.role;
    const isMaster = role === "MASTER";

    // Search state
    const [activeTab, setActiveTab] = useState<SearchMode>(defaultTab);
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
        suppliers: LookupItem[]; employees: LookupItem[]; subcontractors: LookupItem[];
    } | null>(null);

    // Modals
    const [showSelectModal, setShowSelectModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [calHistory, setCalHistory] = useState<CalHistory[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Load Lookups
    useEffect(() => {
        fetch("/api/search?mode=lookups")
            .then(r => r.json())
            .then(setLookups)
            .catch(() => toast.error("Failed to load lookup data"));
    }, []);

    // Sync activeTab with defaultTab prop
    useEffect(() => {
        setActiveTab(defaultTab);
        setSearchQuery("");
        setSelectedEquipment(null);
        setResults([]);
        if (defaultTab === "ongoing" || defaultTab === "expirations") {
            setTimeout(() => handleSearch(defaultTab, ""), 100);
        }
    }, [defaultTab]);

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

    const selectEquipment = (eq: Equipment) => {
        setSelectedEquipment(eq);
        setEditData({ ...eq });
        setShowSelectModal(false);
    };

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
                    stat: editData.STAT,
                    modeCode: editData.MODE_CODE,
                    last: isMaster ? editData.LAST : undefined,
                    next: isMaster ? editData.NEXT : undefined,
                }),
            });
            if (!res.ok) throw new Error();
            toast.success("저장 완료");
            await handleSearch("regNo", selectedEquipment.ISID);
        } catch {
            toast.error("저장 중 오류가 발생했습니다");
        } finally {
            setIsSaving(false);
        }
    };

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

    const downloadReport = async (calNo: string) => {
        const loadingToast = toast.loading("Downloading report...");
        try {
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

    const updateField = (key: string, value: string) => {
        let finalValue = value;
        if (key === "LAST" || key === "NEXT") {
            finalValue = parseDate(value);
        }
        setEditData(prev => ({ ...prev, [key]: finalValue }));
    };

    const searchTypeLabels: Record<SearchType, string> = {
        regNo: "REG NO",
        asset: "ASSET",
        sn: "S/N",
    };

    const categoryTitles: Record<SearchMode, { title: string; subtitle: string; icon: any; color: string }> = {
        regNo: { title: "Equipment Registry", subtitle: "Search by System Registration ID", icon: Database, color: "text-blue-600" },
        asset: { title: "Asset Search", subtitle: "Search by Internal Asset Number", icon: Search, color: "text-indigo-600" },
        sn: { title: "Serial Number Search", subtitle: "Find Equipment by Manufacturer S/N", icon: Search, color: "text-violet-600" },
        calNo: { title: "Calibration Lookup", subtitle: "Search via Calibration Certificate Number", icon: FileText, color: "text-emerald-600" },
        model: { title: "Model Search", subtitle: "Filter Equipment by Model Name", icon: Wrench, color: "text-amber-600" },
        ongoing: { title: "On-Going Jobs", subtitle: "Currently active calibration processes", icon: Clock, color: "text-blue-500" },
        expirations: { title: "Expiring Soon", subtitle: "Equipment requiring recalibration", icon: AlertTriangle, color: "text-rose-600" },
    };

    const currentCategory = categoryTitles[activeTab === "regNo" ? searchType : activeTab] || categoryTitles.regNo;

    return (
        <div className="space-y-8 w-full animate-in fade-in duration-500">
            {/* ── Dynamic Header ──────────────────────────── */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-10 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#001489]/5 rounded-full -mr-32 -mt-32 blur-3xl" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm ${currentCategory.color}`}>
                            <currentCategory.icon className="w-7 h-7 md:w-8 md:h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                                {currentCategory.title.split(' ')[0]} <span className="text-[#001489]">{currentCategory.title.split(' ').slice(1).join(' ')}</span>
                            </h2>
                            <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest mt-1 italic">{currentCategory.subtitle}</p>
                        </div>
                    </div>

                    {/* ── Integrated Search Bar ────────────────── */}
                    {["regNo", "calNo", "model"].includes(activeTab) && (
                        <div className="flex items-center gap-3 w-full md:max-w-xl bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                            {activeTab === "regNo" && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                        className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 hover:border-[#001489] transition-all shadow-sm min-w-[110px]"
                                    >
                                        {searchTypeLabels[searchType]}
                                        <ChevronDown className="w-3 h-3 text-slate-400" />
                                    </button>
                                    {showTypeDropdown && (
                                        <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[130px] animate-in slide-in-from-top-2 duration-200">
                                            {(Object.keys(searchTypeLabels) as SearchType[]).map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => { setSearchType(t); setShowTypeDropdown(false); }}
                                                    className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider transition-colors ${searchType === t ? "bg-[#001489] text-white" : "text-slate-600 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    {searchTypeLabels[t]}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

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
                                            ? `ENTER ${searchTypeLabels[searchType]}...`
                                            : activeTab === "calNo"
                                                ? "ENTER CAL NO..."
                                                : "ENTER MODEL NAME..."
                                    }
                                    className="h-12 border-none bg-transparent shadow-none text-sm font-black uppercase placeholder:text-slate-300 focus-visible:ring-0"
                                />
                            </div>

                            <Button
                                onClick={() => {
                                    const mode = activeTab === "regNo" ? searchType : activeTab;
                                    handleSearch(mode as SearchMode);
                                }}
                                disabled={isSearching}
                                className="h-12 px-8 bg-[#001489] hover:bg-[#001489]/90 hover:scale-[1.02] active:scale-95 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 transition-all"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "SEARCH"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Loading for auto-search tabs */}
            {isSearching && (activeTab === "ongoing" || activeTab === "expirations") && (
                <div className="flex flex-col items-center justify-center p-24 bg-white rounded-3xl border border-slate-100 shadow-sm transition-all">
                    <div className="w-16 h-16 border-4 border-[#001489]/10 border-t-[#001489] rounded-full animate-spin mb-6" />
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Fetching Real-time Data...</p>
                </div>
            )}

            {/* Results List */}
            {results.length > 1 && !showSelectModal && selectedEquipment && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity className="w-4 h-4 text-[#001489]" />
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                                Search Results — <span className="text-[#001489] font-black text-xs">{results.length}</span> records found
                            </p>
                        </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 divide-y divide-slate-50">
                            {results.map((eq) => (
                                <button
                                    key={eq.ISID}
                                    onClick={() => selectEquipment(eq)}
                                    className={`w-full flex items-center justify-between px-8 py-4.5 text-left transition-all hover:bg-slate-50 group ${selectedEquipment?.ISID === eq.ISID ? "bg-[#001489]/5 border-l-4 border-l-[#001489]" : "border-l-4 border-l-transparent"
                                        }`}
                                >
                                    <div className="flex items-center gap-8">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">REG NO</span>
                                            <span className={`text-sm font-black transition-colors ${selectedEquipment?.ISID === eq.ISID ? "text-[#001489]" : "text-slate-900"}`}>{eq.ISID}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Equipment</span>
                                            <span className="text-sm font-bold text-slate-700 truncate max-w-md">{eq.NAEM_SUP || eq.NAEM}</span>
                                        </div>
                                        <div className="hidden lg:flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Model</span>
                                            <span className="text-sm font-medium text-slate-500">{eq.MODL || "—"}</span>
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-xl transition-all ${selectedEquipment?.ISID === eq.ISID ? "bg-[#001489] text-white" : "bg-slate-100 text-slate-400 group-hover:bg-[#001489]/10 group-hover:text-[#001489]"}`}>
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Equipment Detail Card */}
            {selectedEquipment && editData && (
                <div className="grid grid-cols-1 gap-8 animate-in slide-in-from-bottom-6 duration-700">
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                        <div className="p-8 md:p-12 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-[#001489]/5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#001489] rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-900/20">
                                        Active Asset Configuration
                                    </div>
                                    <h3 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none">{selectedEquipment.NAEM_SUP || selectedEquipment.NAEM || "UNNAMED EQUIPMENT"}</h3>
                                    <div className="flex flex-wrap gap-6">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">System Operational</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-300 font-bold">|</span>
                                            <span className="text-[11px] font-black text-[#001489] uppercase tracking-widest">ID: {selectedEquipment.ISID}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Button
                                        onClick={openCalHistory}
                                        variant="outline"
                                        className="h-14 px-8 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border-slate-200 hover:border-[#001489] hover:bg-[#001489]/5 hover:text-[#001489] shadow-sm transition-all"
                                    >
                                        <History className="w-4 h-4 mr-3" />
                                        Cal History
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="h-14 px-10 bg-[#001489] hover:bg-[#001489]/90 hover:scale-[1.02] active:scale-95 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 transition-all"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <Save className="w-4 h-4 mr-3" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
                            {/* Primary Info (LHS) */}
                            <div className="lg:col-span-8 space-y-12">
                                <div className="space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px bg-slate-100 flex-1" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Basic Information</span>
                                        <div className="h-px bg-slate-100 flex-1" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <FieldEditable label="Equipment Display Name" value={editData.NAEM_SUP || ""} onChange={(v) => updateField("NAEM_SUP", v)} primary />
                                        <FieldReadOnly label="Master Database Name" value={selectedEquipment.NAEM} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <FieldReadOnly label="Model Specification" value={selectedEquipment.MODL} />
                                        <FieldReadOnly label="Manufacturer Identity" value={`${selectedEquipment.MNFC || ""} ${selectedEquipment.MANUFACTURER_NAME ? `(${selectedEquipment.MANUFACTURER_NAME})` : ""}`} />
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px bg-slate-100 flex-1" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Administrative Identifiers</span>
                                        <div className="h-px bg-slate-100 flex-1" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <FieldEditable label="Internal Asset No" value={editData.ACCN || ""} onChange={(v) => updateField("ACCN", v)} />
                                        <FieldEditable label="Hardware Serial No" value={editData.SERN || ""} onChange={(v) => updateField("SERN", v)} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <FieldEditable label="Operation Memo / Remarks" value={editData.MEMO || ""} onChange={(v) => updateField("MEMO", v)} multiline />
                                        <FieldEditable label="ACC (Accessories)" value={editData.ACC1 || ""} onChange={(v) => updateField("ACC1", v)} multiline />
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Info (RHS - Side Panel Style) */}
                            <div className="lg:col-span-4 space-y-8 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 block text-center mb-4">Management Status</span>

                                <div className="space-y-6">
                                    <FieldCombo
                                        label="Management category"
                                        value={editData.STAT || ""}
                                        displayValue={lookups?.statuses?.find(s => s.CODE === editData.STAT)?.NAME || ""}
                                        options={lookups?.statuses || []}
                                        onChange={(v) => updateField("STAT", v)}
                                    />
                                    <FieldCombo
                                        label="Current operational Status"
                                        value={editData.TYEP || ""}
                                        displayValue={lookups?.types?.find(t => t.CODE === editData.TYEP)?.NAME || ""}
                                        options={lookups?.types || []}
                                        onChange={(v) => updateField("TYEP", v)}
                                    />
                                    <FieldCombo
                                        label="Ownership / Customer"
                                        value={editData.CUST || ""}
                                        displayValue={lookups?.suppliers?.find(s => s.CODE === editData.CUST)?.NAME || editData.CUSTOMER_NAME || ""}
                                        options={lookups?.suppliers || []}
                                        onChange={(v) => updateField("CUST", v)}
                                    />
                                    <FieldCombo
                                        label="SELF/EXT"
                                        value={editData.MODE_CODE || ""}
                                        displayValue={editData.MODE_CODE === "SELF" ? "SELF" : (editData.MODE_CODE ? "EXT" : "")}
                                        options={[{ CODE: "SELF", NAME: "SELF" }, { CODE: "EXT", NAME: "EXT" }]}
                                        onChange={(v) => updateField("MODE_CODE", v === "EXT" ? "" : v)}
                                    />
                                    <FieldCombo
                                        label="SUBCONTRACTOR"
                                        value={editData.MODE_CODE || ""}
                                        displayValue={lookups?.subcontractors?.find(s => s.CODE === editData.MODE_CODE)?.NAME || ""}
                                        options={lookups?.subcontractors || []}
                                        onChange={(v) => updateField("MODE_CODE", v)}
                                    />
                                </div>

                                <div className="pt-6 border-t border-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 block text-center mb-6">Calibration Metrics</span>
                                    <div className="space-y-6">
                                        <FieldEditable
                                            label="Interval (Months)"
                                            value={editData.TERM || ""}
                                            onChange={(v) => { if (/^\d*$/.test(v)) updateField("TERM", v); }}
                                            textAlign="center"
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            {isMaster ? (
                                                <>
                                                    <FieldEditable label="Last Cal" value={editData.LAST || ""} onChange={(v) => updateField("LAST", v)} isDate masterOnly />
                                                    <FieldEditable label="Next Cal" value={editData.NEXT || ""} onChange={(v) => updateField("NEXT", v)} isDate masterOnly />
                                                </>
                                            ) : (
                                                <>
                                                    <FieldReadOnly label="Last Cal" value={formatDate(selectedEquipment.LAST)} />
                                                    <FieldReadOnly label="Next Cal" value={formatDate(selectedEquipment.NEXT)} />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Selection Modal */}
            {showSelectModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setShowSelectModal(false)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Refine Selection</p>
                                <h3 className="text-2xl font-black text-slate-950">Found {results.length} Matching Records</h3>
                            </div>
                            <button onClick={() => setShowSelectModal(false)} className="p-3 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all border border-slate-100 shadow-sm"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="overflow-y-auto max-h-[60vh] custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#001489]/5 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">System ID</th>
                                        <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Asset Detail</th>
                                        <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {results.map((eq) => (
                                        <tr
                                            key={eq.ISID}
                                            onClick={() => selectEquipment(eq)}
                                            className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-10 py-6 font-black text-[#001489] text-base">{eq.ISID}</td>
                                            <td className="px-10 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 line-clamp-1">{eq.NAEM_SUP || eq.NAEM}</span>
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{eq.MODL} • {eq.SERN}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#001489] opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Select <ChevronRight className="w-3.5 h-3.5" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#001489]/5 to-white">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#001489] mb-2 uppercase">Calibration Lifecycle</p>
                                <h3 className="text-2xl font-black text-slate-950">History for ID: {selectedEquipment?.ISID}</h3>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100 shadow-sm"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="overflow-y-auto max-h-[60vh] custom-scrollbar">
                            {isLoadingHistory ? (
                                <div className="flex flex-col items-center justify-center p-24">
                                    <div className="w-12 h-12 border-4 border-[#001489]/10 border-t-[#001489] rounded-full animate-spin mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading History...</p>
                                </div>
                            ) : calHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-24 text-slate-400">
                                    <AlertTriangle className="w-12 h-12 mb-4 text-slate-200" />
                                    <p className="text-sm font-bold uppercase tracking-widest">No Calibration Records Available</p>
                                </div>
                            ) : (
                                <div className="p-2">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Cert No</th>
                                                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status / Report</th>
                                                <th className="px-10 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {calHistory.map((h, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-10 py-6 font-black text-[#001489] text-base">{h.CIDU}</td>
                                                    <td className="px-10 py-6 font-bold text-slate-900 text-sm whitespace-nowrap">{formatDate(h.CARD)}</td>
                                                    <td className="px-10 py-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-700">{h.LOCT || "Laboratory"}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h.KOLAS_NO || "Standard Report"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        <Button
                                                            onClick={() => downloadReport(h.CIDU)}
                                                            className="h-11 px-6 bg-slate-950 hover:bg-[#001489] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-black/5"
                                                        >
                                                            <Download className="w-4 h-4 mr-2" />
                                                            Download PDF
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #00148922; }
            `}</style>
        </div>
    );
}

// ── Helpers & Sub-Components ─────────────────────────────────

function FieldReadOnly({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
            <div className={`px-6 py-5 rounded-2xl border text-sm transition-all ${highlight
                ? "bg-[#001489]/5 border-[#001489]/30 text-[#001489] font-black shadow-inner"
                : "bg-slate-50 shadow-inner border-slate-100 text-slate-600 font-bold"
                }`}>
                {value || "-"}
            </div>
        </div>
    );
}

function FieldEditable({ label, value, onChange, multiline, masterOnly, textAlign = "left", primary = false, isDate = false }: {
    label: string; value: string; onChange: (v: string) => void; multiline?: boolean; masterOnly?: boolean; textAlign?: "left" | "center"; primary?: boolean; isDate?: boolean;
}) {
    const displayValue = isDate ? formatDate(value) : value;

    return (
        <div className="space-y-3 group/field">
            <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-focus-within/field:text-[#001489] transition-colors">{label}</label>
                {masterOnly && (
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Auth Required</span>
                )}
            </div>
            {multiline ? (
                <textarea
                    value={displayValue || ""}
                    onChange={(e) => onChange(e.target.value)}
                    rows={4}
                    className="w-full px-6 py-5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-[#001489]/5 focus:border-[#001489] transition-all resize-none placeholder:text-slate-200"
                />
            ) : (
                <input
                    type="text"
                    value={displayValue || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full px-6 py-5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-[#001489]/5 focus:border-[#001489] transition-all placeholder:text-slate-200 ${textAlign === "center" ? "text-center" : ""} ${primary ? "text-base font-black border-[#001489]/20" : ""}`}
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
        <div className="space-y-3 relative group/field">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within/field:text-[#001489] transition-colors">{label}</label>
            <button
                onClick={() => { setOpen(!open); setFilter(""); }}
                className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-900 bg-white hover:border-[#001489] transition-all shadow-sm ${open ? "ring-4 ring-[#001489]/5 border-[#001489]" : ""}`}
            >
                <span className="truncate">{displayValue || "SELECT OPTION"}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${open ? "rotate-180 text-[#001489]" : ""}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="p-4 bg-slate-50 border-b border-slate-100">
                            <input
                                autoFocus
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                placeholder="Search Options..."
                                className="w-full px-5 py-3 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-[#001489]/10 focus:border-[#001489] transition-all"
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {filtered.slice(0, 100).map(o => (
                                <button
                                    key={o.CODE}
                                    onClick={() => { onChange(o.CODE); setOpen(false); }}
                                    className={`w-full flex items-center justify-between px-8 py-4 text-xs font-bold hover:bg-slate-50 transition-colors text-left ${value === o.CODE ? "bg-[#001489]/5 text-[#001489] font-black" : "text-slate-600"
                                        }`}
                                >
                                    <span className="truncate">{o.NAME || o.CODE}</span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${value === o.CODE ? "bg-[#001489] text-white" : "bg-slate-100 text-slate-400"}`}>{o.CODE}</span>
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <p className="px-8 py-8 text-xs font-black uppercase tracking-[0.2em] text-slate-300 text-center italic">No results found</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
