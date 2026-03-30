import React, { useState, useEffect } from 'react';
import { Search, Calendar, ChevronDown, Download, AlertTriangle, ArrowUpDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface LookupItem {
    CODE: string;
    NAME: string;
}

interface AdvancedExpirationSearchProps {
    lookups?: {
        types: LookupItem[];
        modes: LookupItem[];
        statuses: LookupItem[];
        suppliers: LookupItem[];
        employees: LookupItem[];
        subcontractors: LookupItem[];
    } | null;
}

export default function AdvancedExpirationSearch({ lookups }: AdvancedExpirationSearchProps) {
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null });

    const [filters, setFilters] = useState({
        applicant: '',
        dueDateStart: '',
        dueDateEnd: ''
    });

    const updateFilter = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearch = async () => {
        setIsSearching(true);
        try {
            const params = new URLSearchParams({ mode: "expirations" });
            if (filters.applicant) params.append("q", filters.applicant);
            if (filters.dueDateStart) params.append("startDate", filters.dueDateStart.replace(/-/g, ''));
            if (filters.dueDateEnd) params.append("endDate", filters.dueDateEnd.replace(/-/g, ''));

            const res = await fetch(`/api/search?${params.toString()}`);
            const data = await res.json();
            
            if (!res.ok) {
                toast.error(data.error || "Search failed");
                return;
            }
            
            setResults(data);
        } catch (error) {
            console.error("Search error:", error);
            toast.error("검색 중 오류가 발생했습니다.");
        } finally {
            setIsSearching(false);
        }
    };

    const downloadReport = async (isid: string, calNo: string) => {
        if (!calNo || calNo === "—") return;
        const loadingToast = toast.loading(`Downloading certificate ${calNo}...`);
        try {
            const res = await fetch(`/api/equipment/download?id=${isid}&type=report&calno=${calNo}`);
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

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedResults = React.useMemo(() => {
        if (!sortConfig.key || !sortConfig.direction) return results;

        return [...results].sort((a, b) => {
            const aVal = String(a[sortConfig.key] || '');
            const bVal = String(b[sortConfig.key] || '');
            return sortConfig.direction === 'asc' 
                ? aVal.localeCompare(bVal, undefined, { numeric: true }) 
                : bVal.localeCompare(aVal, undefined, { numeric: true });
        });
    }, [results, sortConfig]);

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' 
            ? <ChevronUp className="w-3 h-3 ml-1 text-rose-500" /> 
            : <ChevronDown className="w-3 h-3 ml-1 text-rose-500" />;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr === '0') return "—";
        if (dateStr.length === 8) {
            return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        }
        return dateStr;
    };

    const exportToExcel = () => {
        if (results.length === 0) return;
        const headers = ["REGNO", "EQIP_NAME", "NAEM", "MODEL", "SN", "ASSET", "APPLICANT", "TERM", "LAST_CAL", "DUE_DATE", "STATE"];
        const csvRows = [headers.join(",")];
        
        results.forEach(r => {
            const row = [
                r.ISID, `"${(r.NAEM_SUP || "").replace(/"/g, '""')}"`, `"${(r.NAEM || "").replace(/"/g, '""')}"`, 
                r.MODL, r.SERN || "", r.ACCN || "", `"${(r.APPLICANT || "").replace(/"/g, '""')}"`,
                r.TERM ? `${r.TERM}m` : "", r.LAST || "", r.NEXT || "", r.STATUS_NAME || ""
            ];
            csvRows.push(row.join(","));
        });

        const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Expirations_List_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 w-full animate-in fade-in duration-500 pb-20">
            {/* Search Condition Panel */}
            <div className="bg-white rounded-2xl border border-rose-200/60 shadow-sm overflow-hidden flex flex-col xl:flex-row">
                <div className="p-3 md:p-4 xl:p-5 border-b xl:border-b-0 xl:border-r border-rose-100 bg-rose-50/30 flex flex-col justify-center xl:w-48 shrink-0">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600 flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        Next Cal Date
                    </h3>
                    <p className="text-[10px] font-bold text-rose-400 leading-tight">Expiration Tracking Engine</p>
                </div>

                <div className="p-4 md:p-5 xl:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-x-5 md:gap-y-4 flex-1 items-end">
                    
                    <div className="space-y-1.5 lg:col-span-1">
                        <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest pl-1">APPLICANT</label>
                        <div className="relative">
                            <select 
                                value={filters.applicant}
                                onChange={e => updateFilter('applicant', e.target.value)}
                                className="w-full h-9 bg-white border border-rose-200 outline-none focus:ring-1 focus:ring-rose-500/50 rounded-lg px-3 text-xs font-bold text-slate-700 appearance-none shadow-sm"
                            >
                                <option value="">All Companies...</option>
                                {lookups?.suppliers.map(s => <option key={s.CODE} value={s.CODE}>{s.NAME}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-1.5 lg:col-span-1">
                        <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest pl-1">DUE DATE OF CAL</label>
                        <div className="flex items-center gap-2">
                            <Input 
                                type="date" 
                                value={filters.dueDateStart}
                                onChange={e => updateFilter('dueDateStart', e.target.value)}
                                className="h-9 bg-white border-rose-200 focus:border-rose-500 rounded-lg text-xs px-2 shadow-sm" 
                            />
                            <span className="text-rose-300 font-bold">~</span>
                            <Input 
                                type="date" 
                                value={filters.dueDateEnd}
                                onChange={e => updateFilter('dueDateEnd', e.target.value)}
                                className="h-9 bg-white border-rose-200 focus:border-rose-500 rounded-lg text-xs px-2 shadow-sm" 
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-1 w-full">
                        <Button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="h-9 w-full bg-rose-600 hover:bg-rose-700 rounded-lg text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-600/20 transition-all active:scale-95"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search Expirations"}
                        </Button>
                    </div>

                </div>
            </div>

            {/* Results Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                            Expirations List
                            <span className="bg-rose-600/10 text-rose-600 px-2 py-0.5 rounded-full text-[9px] ml-2">{results.length}</span>
                        </h3>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={results.length === 0}
                        onClick={exportToExcel}
                        className="h-7 px-3 rounded-md text-[9px] font-bold uppercase tracking-wider text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm"
                    >
                        <Download className="w-3 h-3 mr-1.5" />
                        Export
                    </Button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    {results.length > 0 ? (
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                                <tr>
                                    {[
                                        { key: 'ISID', label: 'REG NO', color: 'text-[#001489]' },
                                        { key: 'LATEST_CALNO', label: 'CAL NO', color: 'text-slate-400' },
                                        { key: 'NAEM_SUP', label: 'EQPT NAME', color: 'text-slate-950' },
                                        { key: 'MODL', label: 'MODEL', color: 'text-slate-400' },
                                        { key: 'MANUFACTURE', label: 'MANUFACTURER', color: 'text-slate-400' },
                                        { key: 'SERN', label: 'SN', color: 'text-slate-400' },
                                        { key: 'APPLICANT', label: 'APPLICANT', color: 'text-slate-400' },
                                        { key: 'NEXT', label: 'DUE DATE', color: 'text-rose-600' },
                                        { key: 'TERM', label: 'TERM', color: 'text-slate-400' },
                                        { key: 'OWNM', label: 'CONTACT', color: 'text-slate-400' }
                                    ].map(col => (
                                        <th 
                                            key={col.key}
                                            onClick={() => requestSort(col.key)}
                                            className={`px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest ${col.color} cursor-pointer group hover:bg-slate-100 transition-colors`}
                                        >
                                            <div className="flex items-center">
                                                {col.label}
                                                <SortIcon columnKey={col.key} />
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedResults.map((row, idx) => (
                                    <tr key={row.ISID + idx} className="hover:bg-rose-600/5 transition-colors cursor-pointer group">
                                        <td className="px-3 py-2 text-[11px] font-black text-slate-900 group-hover:text-rose-600 transition-colors uppercase cursor-pointer">{row.ISID}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-600">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); downloadReport(row.ISID, row.LATEST_CALNO); }}
                                                className="hover:text-indigo-600 hover:underline underline-offset-4 decoration-indigo-300 transition-all font-black"
                                            >
                                                {row.LATEST_CALNO || "—"}
                                            </button>
                                        </td>
                                        <td className="px-3 py-2 text-[11px] font-black text-slate-800">{row.NAEM_SUP}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500 bg-slate-50/50">{row.MODL}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.MANUFACTURE}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.SERN}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-600">{row.APPLICANT}</td>
                                        <td className="px-3 py-2 text-[11px] font-black text-rose-600 bg-rose-50/50">{formatDate(row.NEXT)}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-500">{row.TERM}m</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-600">{row.OWNM || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            {isSearching ? (
                                <Loader2 className="w-8 h-8 text-rose-600 animate-spin mb-4" />
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                                        <AlertTriangle className="w-6 h-6 text-rose-300" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 mb-1">No upcoming expirations</p>
                                    <p className="text-[11px] font-medium text-slate-400/70">Click search to load real data.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
