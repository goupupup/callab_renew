"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import {
    Search, ChevronDown, Save, History, Download, X, Loader2,
    FileText, AlertTriangle, Clock, Wrench, ChevronRight, Activity, Database, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdvancedCalNoSearch from "./components/AdvancedCalNoSearch";
import AdvancedOngoingSearch from "./components/AdvancedOngoingSearch";
import AdvancedModelSearch from "./components/AdvancedModelSearch";
import AdvancedExpirationSearch from "./components/AdvancedExpirationSearch";

// ── Types ────────────────────────────────────────────────────
interface Equipment {
    ISID: string;
    ACCN: string;
    SERN: string;
    MODL: string;
    NAEM_SUP: string; // Equipment Display Name
    NAEM: string;     // Master Name
    MNFC: string;
    CUST: string;
    MEMO: string;
    ACC1: string;
    TYEP: string;
    MODE_CODE: string;
    SELF: string;
    EXTN: string;
    TERM: string;
    LAST: string;
    NEXT: string;
    STAT: string;
    DPCD: string;
    OWNM: string;
    MANUFACTURE: string;
    APPLICANT: string;
    DIVN: string;
    DEPART: string;
    REG_ENGINEER: string;
    LATEST_ENGINEER_NAME: string;
    ASSISTANCE: string;
    STATUS_NAME: string;
    MODE_NAME: string;
    COST_EXE: string;
    COST_CAL: string;
    CALN: string;
    EXER: string;
    SPC1: string;
    LATEST_CALNO: string;
    // Ongoing fields
    DELAY_RSN?: string;
    CASD?: string;
    SCHE?: string;
    MEMO_CAL?: string;
    ACC2?: string;
    CTEL?: string;
    RECEPTIONIST?: string;
}

interface MasterRecord {
    MDLNO: string;
    EQPNAM: string;
    MDLNAM: string;
    MNFCTR: string;
    MNFC: string;
    CALTRM: string;
    MODE_CODE: string;
    SELF: string;
    CLSMAN_EXT: string;
    CLSMAN: string;
    CALCLS: string;
}

interface LookupItem { CODE: string; NAME: string; DESCRIPTION?: string; }
interface CalHistory {
    CIDU: string;
    KOLAS_NO: string;
    CARD: string;
    CASD: string;
    ENGINEER: string;
    SALE_COMPANY: string;
    SUBCON: string;
}

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
    const [showMasterModal, setShowMasterModal] = useState(false);
    const [calHistory, setCalHistory] = useState<CalHistory[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const [masterSearch, setMasterSearch] = useState({ name: "", model: "", manufacturer: "" });
    const [masterResults, setMasterResults] = useState<MasterRecord[]>([]);
    const [selectedMaster, setSelectedMaster] = useState<Partial<MasterRecord>>({});
    const [isLoadingMasterResults, setIsLoadingMasterResults] = useState(false);

    // Search Filters
    const [ongoingFilter, setOngoingFilter] = useState({
        regno: "", calno: "", applicant: "", contact: "", engineer: "",
        startDate: "", endDate: "", selfExt: "1", onoffSite: "B"
    });
    const [expirationFilter, setExpirationFilter] = useState({
        applicant: "", startDate: "", endDate: ""
    });
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [batchUpdate, setBatchUpdate] = useState({ engineer: "", date: "", reason: "" });

    // Load Lookups
    useEffect(() => {
        apiFetch("/api/search/lookups")
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
        if (defaultTab === "ongoing") {
            setTimeout(() => handleSearch(defaultTab, ""), 100);
        }
    }, [defaultTab]);

    const handleSearch = useCallback(async (mode?: SearchMode, query?: string) => {
        const m = mode || activeTab;
        const q = query !== undefined ? query : searchQuery;

        if (m === "ongoing") {
            return handleOngoingSearch();
        }

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
                toast.info("No Data");
            } else if (data.length === 1) {
                selectEquipment(data[0]);
                setResults(data);
            } else {
                setResults(data);
                if (["asset", "sn", "model", "expirations"].includes(m)) {
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
    }, [activeTab, searchQuery, ongoingFilter]);

    const handleOngoingSearch = async () => {
        setIsSearching(true);
        setSelectedEquipment(null);
        setResults([]);
        setSelectedRows([]);

        try {
            const params = new URLSearchParams({ mode: "ongoing", ...ongoingFilter });
            const res = await fetch(`/api/search?${params.toString()}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setResults(data);
            if (data.length === 0) toast.info("No ongoing results found");
        } catch {
            toast.error("진행 내역 검색 중 오류가 발생했습니다");
        } finally {
            setIsSearching(false);
        }
    };

    const handleExpirationSearch = async () => {
        if (!expirationFilter.startDate && !expirationFilter.endDate) {
            toast.error("Please enter the due date of cal");
            return;
        }

        setIsSearching(true);
        setSelectedEquipment(null);
        setResults([]);

        try {
            const params = new URLSearchParams({ 
                mode: "expirations", 
                applicant: expirationFilter.applicant,
                startDate: expirationFilter.startDate,
                endDate: expirationFilter.endDate
            });
            const res = await fetch(`/api/search?${params.toString()}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Search Error");
            }
            const data = await res.json();
            setResults(data);
            if (data.length === 0) toast.info("No data found");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSearching(false);
        }
    };

    const selectEquipment = (eq: Equipment) => {
        setSelectedEquipment(eq);
        setEditData({ ...eq });
        setShowSelectModal(false);
    };

    const handleSave = async () => {
        if (!selectedEquipment) return;
        
        if (!window.confirm("Do you really want to change this information?")) {
            return;
        }

        setIsSaving(true);
        try {
            const body = {
                ISID: selectedEquipment.ISID,
                NAEM_SUP: editData.NAEM_SUP,
                ACCN: editData.ACCN,
                SERN: editData.SERN,
                MEMO: editData.MEMO,
                ACC1: editData.ACC1,
                TYEP: editData.TYEP,
                MODE_CODE: editData.MODE_CODE,
                TERM: editData.TERM,
                CUST: editData.CUST,
                STAT: editData.STAT,
                SELF: editData.SELF,
                EXTN: editData.EXTN,
                NAEM: editData.NAEM,
                MODL: editData.MODL,
                MNFC: editData.MNFC,
                LAST: isMaster ? editData.LAST : undefined,
                NEXT: isMaster ? editData.NEXT : undefined,
            };

            const res = await fetch("/api/search", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error();
            toast.success("저장 완료");
            await handleSearch("regNo", selectedEquipment.ISID);
        } catch (err) {
            toast.error("저장 중 오류가 발생했습니다");
        } finally {
            setIsSaving(false);
        }
    };

    const handleMasterSearch = async () => {
        setIsLoadingMasterResults(true);
        try {
            const params = new URLSearchParams({
                mode: "masterSearch",
                name: masterSearch.name,
                model: masterSearch.model,
                manufacturer: masterSearch.manufacturer
            });
            const res = await fetch(`/api/search?${params.toString()}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setMasterResults(data);
            if (data.length === 0) toast.info("No master records found");
        } catch {
            toast.error("Failed to search master database");
        } finally {
            setIsLoadingMasterResults(false);
        }
    };

    const applyMasterSelection = () => {
        if (!selectedMaster.MDLNO) {
            toast.error("Please select a master record first");
            return;
        }

        setEditData(prev => ({
            ...prev,
            NAEM: selectedMaster.EQPNAM || prev.NAEM,
            MODL: selectedMaster.MDLNAM || prev.MODL,
            MNFC: selectedMaster.MNFC || prev.MNFC,
            MANUFACTURE: selectedMaster.MNFCTR || prev.MANUFACTURE, // For display
            TERM: selectedMaster.CALTRM || prev.TERM,
            SELF: selectedMaster.SELF || prev.SELF,
            MODE_CODE: selectedMaster.MODE_CODE || prev.MODE_CODE // Applied Here
        }));

        setShowMasterModal(false);
        toast.success("Master information applied. Click 'Save Changes' to persist.");
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
            const res = await fetch(`/api/equipment/download?id=${selectedEquipment?.ISID}&type=report&calno=${calNo}`);
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

    const updateField = (key: keyof Equipment, value: string) => {
        let finalValue = value;
        if (key === "LAST" || key === "NEXT") {
            finalValue = parseDate(value);
        }
        setEditData((prev: Partial<Equipment>) => ({ ...prev, [key]: finalValue }));
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

    if (activeTab === "calNo") return <AdvancedCalNoSearch lookups={lookups} />;
    if (activeTab === "ongoing") return <AdvancedOngoingSearch lookups={lookups} />;
    if (activeTab === "model") return <AdvancedModelSearch lookups={lookups} />;
    if (activeTab === "expirations") return <AdvancedExpirationSearch lookups={lookups} />;

    return (
        <div className="space-y-4 w-full animate-in fade-in duration-500">
            {/* ── Dynamic Header ──────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#001489]/5 rounded-full -mr-32 -mt-32 blur-3xl" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm ${currentCategory.color}`}>
                            <currentCategory.icon className="w-6 h-6 md:w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                                {currentCategory.title.split(' ')[0]} <span className="text-[#001489]">{currentCategory.title.split(' ').slice(1).join(' ')}</span>
                            </h2>
                            <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-0.5 italic">{currentCategory.subtitle}</p>
                        </div>
                    </div>

                    {/* ── Integrated Search Bar ────────────────── */}
                    {["regNo", "asset", "sn", "calNo", "model"].includes(activeTab) && (
                        <div className="flex items-center gap-2 w-full md:max-w-md bg-slate-50 p-1.5 rounded-xl border border-slate-100 shadow-inner">
                            {activeTab === "regNo" && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-700 hover:border-[#001489] transition-all shadow-sm min-w-[90px]"
                                    >
                                        {searchTypeLabels[searchType]}
                                        <ChevronDown className="w-3 h-3 text-slate-400" />
                                    </button>
                                    {showTypeDropdown && (
                                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden min-w-[110px] animate-in slide-in-from-top-2 duration-200">
                                            {(Object.keys(searchTypeLabels) as SearchType[]).map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => { setSearchType(t); setShowTypeDropdown(false); }}
                                                    className={`w-full text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-wider transition-colors ${searchType === t ? "bg-[#001489] text-white" : "text-slate-600 hover:bg-slate-50"
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
                                    placeholder={`ENTER ${searchTypeLabels[searchType]}...`}
                                    className="h-9 border-none bg-transparent shadow-none text-xs font-black uppercase placeholder:text-slate-300 focus-visible:ring-0"
                                />
                            </div>

                            <Button
                                onClick={() => {
                                    const mode = activeTab === "regNo" ? searchType : activeTab;
                                    handleSearch(mode as SearchMode);
                                }}
                                disabled={isSearching}
                                className="h-9 px-6 bg-[#001489] hover:bg-[#001489]/90 hover:scale-[1.02] active:scale-95 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 transition-all"
                            >
                                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "SEARCH"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Results List (Equipment Picker for standard search) */}
            {results.length > 1 && !showSelectModal && selectedEquipment && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity className="w-3.5 h-3.5 text-[#001489]" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                Search Results — <span className="text-[#001489] font-black text-xs">{results.length}</span> records found
                            </p>
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 divide-y divide-slate-50">
                            {results.map((eq) => (
                                <button
                                    key={eq.ISID}
                                    onClick={() => selectEquipment(eq)}
                                    className={`w-full flex items-center justify-between px-6 py-2.5 text-left transition-all hover:bg-slate-50 group ${selectedEquipment?.ISID === eq.ISID ? "bg-[#001489]/5 border-l-4 border-l-[#001489]" : "border-l-4 border-l-transparent"
                                        }`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">REG NO</span>
                                            <span className={`text-xs font-black transition-colors ${selectedEquipment?.ISID === eq.ISID ? "text-[#001489]" : "text-slate-900"}`}>{eq.ISID}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Equipment</span>
                                            <span className="text-xs font-bold text-slate-700 truncate max-w-sm">{eq.NAEM_SUP || eq.NAEM}</span>
                                        </div>
                                        <div className="hidden lg:flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Model</span>
                                            <span className="text-xs font-medium text-slate-500">{eq.MODL || "—"}</span>
                                        </div>
                                    </div>
                                    <div className={`p-1.5 rounded-lg transition-all ${selectedEquipment?.ISID === eq.ISID ? "bg-[#001489] text-white" : "bg-slate-100 text-slate-400 group-hover:bg-[#001489]/10 group-hover:text-[#001489]"}`}>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Equipment Detail Card (Only for non-ongoing or specific selection) */}
            {selectedEquipment && editData && (
                <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-bottom-6 duration-700 pb-12">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-[#001489]/5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#001489] rounded-full text-[8px] font-black uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-900/20">
                                        Active Asset Configuration
                                    </div>
                                    <h3 className="text-xl md:text-3xl font-black text-slate-950 tracking-tighter leading-none">{selectedEquipment.NAEM_SUP || selectedEquipment.NAEM || "UNNAMED EQUIPMENT"}</h3>
                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Operational</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-300 font-bold">|</span>
                                            <span className="text-[10px] font-black text-[#001489] uppercase tracking-widest">ID: {selectedEquipment.ISID}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={openCalHistory}
                                        variant="outline"
                                        className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border-slate-200 hover:border-[#001489] hover:bg-[#001489]/5 hover:text-[#001489] shadow-sm transition-all"
                                    >
                                        <History className="w-3.5 h-3.5 mr-2" />
                                        Cal History
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="h-10 px-8 bg-[#001489] hover:bg-[#001489]/90 hover:scale-[1.02] active:scale-95 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 transition-all"
                                    >
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 md:p-6 xl:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10">
                            {/* Primary Info (LHS) */}
                            <div className="lg:col-span-6 xl:col-span-8 space-y-6 md:space-y-8">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px bg-slate-100 flex-1" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">Basic Information</span>
                                        <div className="h-px bg-slate-100 flex-1" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldCombo
                                            label="Ownership / Customer"
                                            value={editData.CUST || ""}
                                            displayValue={lookups?.suppliers?.find(s => s.CODE === editData.CUST)?.NAME || editData.APPLICANT || ""}
                                            options={lookups?.suppliers || []}
                                            onChange={(v) => updateField("CUST", v)}
                                        />
                                        <div />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldEditable label="Equipment Display Name" value={editData.NAEM_SUP || ""} onChange={(v) => updateField("NAEM_SUP", v)} primary />
                                        <div className="relative group">
                                            <FieldReadOnly label="Master Database Name" value={editData.NAEM || selectedEquipment.NAEM} />
                                            {isMaster && (
                                                <button
                                                    onClick={() => {
                                                        setMasterSearch({ name: "", model: "", manufacturer: "" });
                                                        setMasterResults([]);
                                                        setSelectedMaster({});
                                                        setShowMasterModal(true);
                                                    }}
                                                    className="absolute right-1 top-6 p-2 rounded-lg bg-white border border-slate-200 text-[#001489] hover:bg-[#001489] hover:text-white shadow-sm transition-all z-10"
                                                    title="Manage Master Database"
                                                >
                                                    <Database className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldReadOnly label="Model Specification" value={editData.MODL || selectedEquipment.MODL} />
                                        <FieldReadOnly label="Manufacturer Identity" value={editData.MANUFACTURE || selectedEquipment.MANUFACTURE || selectedEquipment.MNFC || ""} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldReadOnly label="Division" value={selectedEquipment.DIVN || "—"} />
                                        <FieldReadOnly label="Department" value={selectedEquipment.DEPART || "—"} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldReadOnly label="Owner Name" value={selectedEquipment.OWNM || "—"} />
                                        <FieldReadOnly label="DPCD" value={selectedEquipment.DPCD || "—"} />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px bg-slate-100 flex-1" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">Administrative Identifiers</span>
                                        <div className="h-px bg-slate-100 flex-1" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldEditable label="Internal Asset No" value={editData.ACCN || ""} onChange={(v) => updateField("ACCN", v)} />
                                        <FieldEditable label="Hardware Serial No" value={editData.SERN || ""} onChange={(v) => updateField("SERN", v)} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldEditable label="Operation Memo / Remarks" value={editData.MEMO || ""} onChange={(v) => updateField("MEMO", v)} multiline />
                                        <FieldEditable label="ACC (Accessories)" value={editData.ACC1 || ""} onChange={(v) => updateField("ACC1", v)} multiline />
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Info (RHS - Side Panel Style) */}
                            <div className="lg:col-span-6 xl:col-span-4 space-y-4 bg-slate-50/50 p-4 md:p-6 rounded-2xl border border-slate-100">
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 block text-center mb-2">Management Status</span>

                                <div className="space-y-3">
                                    <FieldCombo
                                        label="Management category"
                                        value={editData.TYEP || ""}
                                        displayValue={lookups?.types?.find(t => t.CODE === editData.TYEP)?.NAME || ""}
                                        options={lookups?.types || []}
                                        onChange={(v) => updateField("TYEP", v)}
                                    />
                                    <FieldCombo
                                        label="Current operational Status"
                                        value={editData.MODE_CODE || ""}
                                        displayValue={lookups?.modes?.find(m => m.CODE === editData.MODE_CODE)?.NAME || ""}
                                        options={lookups?.modes || []}
                                        onChange={(v) => updateField("MODE_CODE", v)}
                                    />
                                    <FieldCombo
                                        label="SELF/EXT"
                                        value={editData.SELF || ""}
                                        displayValue={editData.SELF === '1' ? 'SELF' : 'EXT'}
                                        options={[{ CODE: '1', NAME: 'SELF' }, { CODE: '0', NAME: 'EXT' }]}
                                        onChange={(v) => {
                                            updateField("SELF", v);
                                            if (v === '1') updateField("EXTN", "");
                                        }}
                                    />
                                    <div className={`transition-all duration-300 ${editData.SELF === '0' ? "opacity-100" : "opacity-40 pointer-events-none grayscale"}`}>
                                        <FieldCombo
                                            label="SUBCONTRACTOR"
                                            value={editData.EXTN || ""}
                                            displayValue={editData.EXTN || ""}
                                            options={lookups?.subcontractors || []}
                                            onChange={(v) => updateField("EXTN", v)}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200">
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 block text-center mb-4">Calibration Metrics</span>
                                    <div className="space-y-3">
                                        <FieldEditable
                                            label="Interval (Months)"
                                            value={editData.TERM || ""}
                                            onChange={(v) => { if (/^\d*$/.test(v)) updateField("TERM", v); }}
                                            textAlign="center"
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {isMaster ? (
                                                <>
                                                    <FieldEditable label="Last Date" value={editData.LAST || ""} onChange={(v) => updateField("LAST", v)} isDate masterOnly />
                                                    <FieldEditable label="Next Date" value={editData.NEXT || ""} onChange={(v) => updateField("NEXT", v)} isDate masterOnly />
                                                </>
                                            ) : (
                                                <>
                                                    <FieldReadOnly label="Last Date" value={formatDate(selectedEquipment.LAST)} />
                                                    <FieldReadOnly label="Next Date" value={formatDate(selectedEquipment.NEXT)} />
                                                </>
                                            )}
                                        </div>
                                        <FieldReadOnly label="Latest Engineer" value={selectedEquipment.LATEST_ENGINEER_NAME || "—"} />
                                        <FieldReadOnly label="Status" value={selectedEquipment.STATUS_NAME || "—"} highlight />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Master Search & Edit Modal */}
            {showMasterModal && (
                <div className="fixed inset-y-0 right-0 left-0 md:left-72 bg-black/60 z-[200] flex items-center justify-center p-2 md:p-8 backdrop-blur-sm transition-all" onClick={() => setShowMasterModal(false)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[98%] xl:max-w-7xl max-h-[98vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Master Management</p>
                                <h3 className="text-2xl font-black text-slate-950">Master Database Search & Editor</h3>
                            </div>
                            <button onClick={() => setShowMasterModal(false)} className="p-3 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all border border-slate-100 shadow-sm"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="overflow-y-auto max-h-[calc(95vh-100px)] custom-scrollbar p-6 md:p-10 space-y-10">
                            {/* Master Search Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#001489]">Master Search</span>
                                    <div className="h-px bg-[#001489]/10 flex-1" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Equipment Name</label>
                                        <input
                                            type="text"
                                            value={masterSearch.name}
                                            onChange={e => setMasterSearch({ ...masterSearch, name: e.target.value })}
                                            onKeyDown={e => e.key === 'Enter' && handleMasterSearch()}
                                            className="w-full px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-[#001489]/5 focus:border-[#001489] transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Model</label>
                                        <input
                                            type="text"
                                            value={masterSearch.model}
                                            onChange={e => setMasterSearch({ ...masterSearch, model: e.target.value })}
                                            onKeyDown={e => e.key === 'Enter' && handleMasterSearch()}
                                            className="w-full px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-[#001489]/5 focus:border-[#001489] transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Manufacturer</label>
                                        <input
                                            type="text"
                                            value={masterSearch.manufacturer}
                                            onChange={e => setMasterSearch({ ...masterSearch, manufacturer: e.target.value })}
                                            onKeyDown={e => e.key === 'Enter' && handleMasterSearch()}
                                            className="w-full px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-[#001489]/5 focus:border-[#001489] transition-all"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleMasterSearch}
                                        disabled={isLoadingMasterResults}
                                        className="h-12 bg-[#001489] font-black uppercase tracking-widest text-xs rounded-xl shadow-lg"
                                    >
                                        {isLoadingMasterResults ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                                        Search Master
                                    </Button>
                                </div>
                            </div>

                            {/* Search Results Table */}
                            <div className="rounded-3xl border border-slate-100 overflow-x-auto bg-slate-50/50 custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead className="bg-[#001489]/5">
                                        <tr>
                                            {['Master Name', 'Model', 'Manu', 'Interval', 'Mode', 'Self', 'Category', 'Code'].map(h => (
                                                <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {masterResults.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center text-xs font-bold text-slate-300 italic">No search results</td>
                                            </tr>
                                        ) : (
                                            masterResults.map((m, idx) => (
                                                <tr key={idx} className="hover:bg-white cursor-pointer transition-colors" onClick={() => setSelectedMaster(m)}>
                                                    <td className="px-6 py-4 text-[11px] font-black text-slate-900">{m.EQPNAM}</td>
                                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{m.MDLNAM}</td>
                                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{m.MNFCTR}</td>
                                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{m.CALTRM}</td>
                                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{m.MODE_CODE}</td>
                                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{m.SELF === '1' ? 'SELF' : 'EXT'}</td>
                                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{m.CLSMAN_EXT}</td>
                                                    <td className="px-6 py-4 text-[11px] font-black text-[#001489]">{m.MDLNO}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Master Detail Editor */}
                            <div className="space-y-8 bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#001489]">Master Detail</span>
                                    <div className="h-px bg-[#001489]/10 flex-1" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Master Name</label>
                                        <input type="text" value={selectedMaster.EQPNAM || ""} onChange={e => setSelectedMaster({ ...selectedMaster, EQPNAM: e.target.value })} className="w-full px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-[#001489] transition-all bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Model</label>
                                        <input type="text" value={selectedMaster.MDLNAM || ""} onChange={e => setSelectedMaster({ ...selectedMaster, MDLNAM: e.target.value })} className="w-full px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-[#001489] transition-all bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Manufacturer</label>
                                        <input type="text" value={selectedMaster.MNFCTR || ""} onChange={e => setSelectedMaster({ ...selectedMaster, MNFCTR: e.target.value })} className="w-full px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-[#001489] transition-all bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Interval</label>
                                        <input type="text" value={selectedMaster.CALTRM || ""} onChange={e => setSelectedMaster({ ...selectedMaster, CALTRM: e.target.value })} className="w-full px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-[#001489] transition-all bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cal Mode</label>
                                        <input type="text" value={selectedMaster.MODE_CODE || ""} onChange={e => setSelectedMaster({ ...selectedMaster, MODE_CODE: e.target.value })} className="w-full px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-[#001489] transition-all bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Self/Ext</label>
                                        <select value={selectedMaster.SELF || "1"} onChange={e => setSelectedMaster({ ...selectedMaster, SELF: e.target.value })} className="w-full px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-[#001489] transition-all bg-white">
                                            <option value="1">SELF</option>
                                            <option value="0">EXT</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
                                        <input type="text" value={selectedMaster.CLSMAN_EXT || ""} onChange={e => setSelectedMaster({ ...selectedMaster, CLSMAN_EXT: e.target.value })} className="w-full px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-[#001489] transition-all bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Master Code</label>
                                        <input type="text" readOnly value={selectedMaster.MDLNO || ""} className="w-full px-5 py-3 rounded-xl border border-slate-100 text-sm font-black text-[#001489] bg-slate-100/50" />
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Button
                                        onClick={applyMasterSelection}
                                        className="flex-1 h-14 bg-[#001489] font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:scale-[1.02] transition-all ring-4 ring-[#001489]/10"
                                    >
                                        <Check className="w-4 h-4 mr-2" /> Apply to Equipment
                                    </Button>
                                    <Button className="flex-1 h-14 bg-white border border-slate-200 text-slate-400 font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-50 transition-all">Update Master</Button>
                                    <Button className="flex-1 h-14 bg-white border border-slate-200 text-slate-400 font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-50 transition-all">Add New Master</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Selection Modal */}
            {showSelectModal && (
                <div className="fixed inset-y-0 right-0 left-0 md:left-72 bg-black/60 z-[200] flex items-center justify-center p-2 md:p-8 backdrop-blur-sm transition-all" onClick={() => setShowSelectModal(false)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[98%] xl:max-w-5xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 md:p-10 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
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
                <div className="fixed inset-y-0 right-0 left-0 md:left-72 bg-black/60 z-[200] flex items-center justify-center p-2 md:p-8 backdrop-blur-sm transition-all" onClick={() => setShowHistoryModal(false)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[98%] xl:max-w-7xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 md:p-10 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#001489]/5 to-white">
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
                                    <table className="w-full text-left border-collapse min-w-[1000px]">
                                        <thead className="bg-[#001489]/5 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Actions</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">CAL NO</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">CERTI NO</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">REC DATE</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">CAL DATE</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">ENGINEER</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">BILL COMPANY</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">SUBCON</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {calHistory.map((h, i) => (
                                                <tr key={i} className="hover:bg-slate-50/80 transition-colors group text-center">
                                                    <td className="px-8 py-6">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); downloadReport(h.CIDU); }}
                                                            className="p-3 bg-slate-950 hover:bg-[#001489] text-white rounded-xl transition-all shadow-lg transform scale-90 group-hover:scale-100"
                                                            title="Download PDF"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className="px-8 py-6 text-left">
                                                        <button
                                                            onClick={() => downloadReport(h.CIDU)}
                                                            className="text-sm font-black text-[#001489] hover:underline transition-all underline-offset-4"
                                                        >
                                                            {h.CIDU}
                                                        </button>
                                                    </td>
                                                    <td className="px-8 py-6 text-xs font-bold text-slate-600 text-left">{h.KOLAS_NO || "—"}</td>
                                                    <td className="px-8 py-6 text-xs font-bold text-slate-900 whitespace-nowrap text-left">{formatDate(h.CARD)}</td>
                                                    <td className="px-8 py-6 text-xs font-bold text-slate-900 whitespace-nowrap text-left">{formatDate(h.CASD)}</td>
                                                    <td className="px-8 py-6 text-xs font-bold text-slate-600 text-left">{h.ENGINEER || "—"}</td>
                                                    <td className="px-8 py-6 text-xs font-bold text-slate-600 text-left">{h.SALE_COMPANY || "—"}</td>
                                                    <td className="px-8 py-6 text-xs font-bold text-slate-600 font-medium italic text-left">{h.SUBCON || "—"}</td>
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
        <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
            <div className={`px-4 py-2.5 rounded-xl border text-[13px] transition-all ${highlight
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
        <div className="space-y-1.5 group/field">
            <div className="flex items-center justify-between ml-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-focus-within/field:text-[#001489] transition-colors">{label}</label>
                {masterOnly && (
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">Auth Required</span>
                )}
            </div>
            {multiline ? (
                <textarea
                    value={displayValue || ""}
                    onChange={(e) => onChange(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-[#001489]/5 focus:border-[#001489] transition-all resize-none placeholder:text-slate-200"
                />
            ) : isDate ? (
                <div className="relative">
                    <input
                        type="text"
                        readOnly
                        value={displayValue || ""}
                        onClick={(e) => {
                            const picker = e.currentTarget.nextElementSibling as HTMLInputElement;
                            if (picker.showPicker) picker.showPicker();
                            else picker.focus();
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-[#001489]/5 focus:border-[#001489] transition-all cursor-pointer ${textAlign === "center" ? "text-center" : ""} ${primary ? "text-sm font-black border-[#001489]/20" : ""}`}
                    />
                    <input
                        type="date"
                        className="absolute inset-0 opacity-0 pointer-events-none"
                        onChange={(e) => {
                            if (!e.target.value) return;
                            const ymd = e.target.value.replace(/-/g, ""); // YYYY-MM-DD -> YYYYMMDD
                            onChange(ymd);
                        }}
                    />
                    <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                </div>
            ) : (
                <input
                    type="text"
                    value={displayValue || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-[#001489]/5 focus:border-[#001489] transition-all placeholder:text-slate-200 ${textAlign === "center" ? "text-center" : ""} ${primary ? "text-sm font-black border-[#001489]/20" : ""}`}
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
        <div className="space-y-1.5 relative group/field">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 group-focus-within/field:text-[#001489] transition-colors">{label}</label>
            <button
                onClick={() => { setOpen(!open); setFilter(""); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-900 bg-white hover:border-[#001489] transition-all shadow-sm ${open ? "ring-4 ring-[#001489]/5 border-[#001489]" : ""}`}
            >
                <span className="truncate">{displayValue || "SELECT OPTION"}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${open ? "rotate-180 text-[#001489]" : ""}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="p-3 bg-slate-50 border-b border-slate-100">
                            <input
                                autoFocus
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                placeholder="Search Options..."
                                className="w-full px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 focus:outline-none focus:ring-4 focus:ring-[#001489]/10 focus:border-[#001489] transition-all"
                            />
                        </div>
                        <div className="max-h-52 overflow-y-auto custom-scrollbar">
                            {filtered.slice(0, 100).map(o => (
                                <button
                                    key={o.CODE}
                                    onClick={() => { onChange(o.CODE); setOpen(false); }}
                                    className={`w-full flex items-center justify-between px-6 py-3 text-[11px] font-bold hover:bg-slate-50 transition-colors text-left ${value === o.CODE ? "bg-[#001489]/5 text-[#001489] font-black" : "text-slate-600"
                                        }`}
                                >
                                    <span className="truncate">{o.NAME || o.CODE}</span>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${value === o.CODE ? "bg-[#001489] text-white" : "bg-slate-100 text-slate-400"}`}>{o.CODE}</span>
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <p className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 text-center italic">No results found</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
