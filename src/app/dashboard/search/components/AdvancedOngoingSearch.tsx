import React, { useState, useEffect } from 'react';
import { Search, Calendar, ChevronDown, CheckSquare, Clock, Download, Info, ArrowUpDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface LookupItem {
    CODE: string;
    NAME: string;
}

interface AdvancedOngoingSearchProps {
    lookups?: {
        types: LookupItem[];
        modes: LookupItem[];
        statuses: LookupItem[];
        suppliers: LookupItem[];
        employees: LookupItem[];
        subcontractors: LookupItem[];
    } | null;
}

export default function AdvancedOngoingSearch({ lookups }: AdvancedOngoingSearchProps) {
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null });

    const [filters, setFilters] = useState({
        regno: '',
        calno: '',
        applicant: '',
        contact: '',
        engineer: '',
        startDate: '',
        endDate: '',
        selfExt: '', // '1'=Self, '0'=Extn
        onoffSite: '', // 'A'=OnSite, 'B'=InHouse
    });

    const updateFilter = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const toggleRow = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newSet = new Set(selectedRows);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedRows(newSet);
    };

    const handleSearch = async () => {
        setIsSearching(true);
        try {
            const params = new URLSearchParams({ mode: "ongoing" });
            if (filters.regno) params.append("regno", filters.regno);
            if (filters.calno) params.append("calno", filters.calno);
            if (filters.applicant) params.append("applicant", filters.applicant);
            if (filters.contact) params.append("contact_person", filters.contact);
            if (filters.engineer) params.append("engineer", filters.engineer);
            if (filters.startDate) params.append("startDate", filters.startDate.replace(/-/g, ''));
            if (filters.endDate) params.append("endDate", filters.endDate.replace(/-/g, ''));
            if (filters.selfExt) params.append("selfExt", filters.selfExt);
            if (filters.onoffSite) params.append("onoffSite", filters.onoffSite);

            const res = await fetch(`/api/search?${params.toString()}`);
            if (!res.ok) throw new Error("Search failed");
            const data = await res.json();
            setResults(data);
        } catch (error) {
            toast.error("Failed to fetch ongoing jobs");
            console.error(error);
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
            ? <ChevronUp className="w-3 h-3 ml-1 text-[#001489]" /> 
            : <ChevronDown className="w-3 h-3 ml-1 text-[#001489]" />;
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
        const headers = ["REGNO", "REG_ENGINEER", "SCHEDULED_DATE", "DELAY_RSN", "EQIP_NAME", "MODEL", "SN", "APPLICANT", "CALNO", "STATUS", "RECEPTION_DATE", "MANUFACTURER", "ACCESSORIES", "MEMO_CAL", "MEMO_REG", "EXTERNAL"];
        const csvRows = [headers.join(",")];
        
        results.forEach(r => {
            const row = [
                r.ISID, r.REG_ENGINEER, formatDate(r.NEXT), `"${(r.DELAY_RSN || "").replace(/"/g, '""')}"`,
                `"${(r.NAEM_SUP || "").replace(/"/g, '""')}"`, r.MODL, r.SERN, `"${(r.APPLICANT || "").replace(/"/g, '""')}"`,
                r.CALN, r.STATUS_NAME, formatDate(r.CASD), r.MANUFACTURE, `"${(r.ACC1 || "").replace(/"/g, '""')}"`,
                `"${(r.MEMO_CAL || "").replace(/"/g, '""')}"`, `"${(r.MEMO || "").replace(/"/g, '""')}"`, r.EXTN || ""
            ];
            csvRows.push(row.join(","));
        });

        const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Ongoing_Jobs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 w-full animate-in fade-in duration-500 pb-20">
            {/* Search Condition Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative z-20">
                <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <Search className="w-4 h-4 text-[#001489]" />
                        Search Condition
                    </h3>
                </div>
                <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">REG NO</label>
                        <Input 
                            value={filters.regno}
                            onChange={e => updateFilter('regno', e.target.value)}
                            className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-[#001489] rounded-lg" 
                            placeholder="e.g. 1234" 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">CAL NO</label>
                        <Input 
                            value={filters.calno}
                            onChange={e => updateFilter('calno', e.target.value)}
                            className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-[#001489] rounded-lg" 
                            placeholder="e.g. 240401-01" 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">APPLICANT</label>
                        <div className="relative">
                            <select 
                                value={filters.applicant}
                                onChange={e => updateFilter('applicant', e.target.value)}
                                className="w-full h-9 bg-slate-50 border border-slate-200 outline-none focus:ring-1 focus:ring-[#001489]/50 rounded-lg px-3 text-xs font-medium text-slate-700 appearance-none"
                            >
                                <option value="">All Companies</option>
                                {lookups?.suppliers.map(s => <option key={s.CODE} value={s.CODE}>{s.NAME}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">CONTACT PERSON</label>
                        <Input 
                            value={filters.contact}
                            onChange={e => updateFilter('contact', e.target.value)}
                            className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-[#001489] rounded-lg" 
                            placeholder="Name" 
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">RESERVED ENGINEER</label>
                        <div className="relative">
                            <select 
                                value={filters.engineer}
                                onChange={e => updateFilter('engineer', e.target.value)}
                                className="w-full h-9 bg-slate-50 border border-slate-200 outline-none focus:ring-1 focus:ring-[#001489]/50 rounded-lg px-3 text-xs font-medium text-slate-700 appearance-none"
                            >
                                <option value="">Any Engineer</option>
                                {lookups?.employees.map(e => <option key={e.CODE} value={e.CODE}>{e.NAME}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">REC DATE</label>
                        <div className="flex items-center gap-2">
                            <Input type="date" value={filters.startDate} onChange={e => updateFilter('startDate', e.target.value)} className="h-9 bg-slate-50 border-slate-200 focus:border-[#001489] rounded-lg text-xs px-2" />
                            <span className="text-slate-300 font-bold">~</span>
                            <Input type="date" value={filters.endDate} onChange={e => updateFilter('endDate', e.target.value)} className="h-9 bg-slate-50 border-slate-200 focus:border-[#001489] rounded-lg text-xs px-2" />
                        </div>
                    </div>

                    <div className="space-y-3 lg:col-span-4 mt-1 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Type:</span>
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={filters.selfExt === '1'} 
                                        onChange={e => updateFilter('selfExt', e.target.checked ? '1' : '')} 
                                        className="w-3.5 h-3.5 rounded text-[#001489] focus:ring-[#001489]/20" 
                                    />
                                    <span className="text-[10px] font-bold text-slate-700 group-hover:text-[#001489] transition-colors">SELF</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={filters.selfExt === '0'} 
                                        onChange={e => updateFilter('selfExt', e.target.checked ? '0' : '')} 
                                        className="w-3.5 h-3.5 rounded text-[#001489] focus:ring-[#001489]/20" 
                                    />
                                    <span className="text-[10px] font-bold text-slate-700 group-hover:text-[#001489] transition-colors">EXTN</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location:</span>
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={filters.onoffSite === 'B'} 
                                        onChange={e => updateFilter('onoffSite', e.target.checked ? 'B' : '')} 
                                        className="w-3.5 h-3.5 rounded text-[#001489] focus:ring-[#001489]/20" 
                                    />
                                    <span className="text-[10px] font-bold text-slate-700 group-hover:text-[#001489] transition-colors">IN HOUSE</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={filters.onoffSite === 'A'} 
                                        onChange={e => updateFilter('onoffSite', e.target.checked ? 'A' : '')} 
                                        className="w-3.5 h-3.5 rounded text-[#001489] focus:ring-[#001489]/20" 
                                    />
                                    <span className="text-[10px] font-bold text-slate-700 group-hover:text-[#001489] transition-colors">ON SITE</span>
                                </label>
                            </div>
                        </div>

                        <Button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="h-10 px-8 bg-[#001489] hover:bg-[#001489]/90 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 transition-all active:scale-95 w-full md:w-auto"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Reserved Action Bar */}
            <div className="bg-[#001489]/5 rounded-2xl border border-[#001489]/10 p-4 flex flex-col md:flex-row md:items-center gap-4 animate-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-2 w-full md:w-1/4">
                    <span className="text-[10px] font-black text-[#001489] uppercase tracking-widest shrink-0">Reserved Person:</span>
                    <div className="relative flex-1">
                        <select className="w-full h-9 bg-white border border-[#001489]/20 outline-none focus:border-[#001489] rounded-lg px-3 text-xs font-bold text-slate-700 appearance-none">
                            <option value="">Select...</option>
                            {lookups?.employees.map(e => <option key={e.CODE} value={e.CODE}>{e.NAME}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#001489]/50 pointer-events-none" />
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-1/4">
                    <span className="text-[10px] font-black text-[#001489] uppercase tracking-widest shrink-0">Scheduled Date:</span>
                    <Input type="date" className="h-9 bg-white border-[#001489]/20 focus:border-[#001489] rounded-lg text-xs px-2" />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                    <span className="text-[10px] font-black text-[#001489] uppercase tracking-widest shrink-0">Delay Reason:</span>
                    <Input className="h-9 bg-white border-[#001489]/20 focus:border-[#001489] rounded-lg text-xs" placeholder="Optional remark..." />
                </div>
                <Button 
                    className="h-9 px-6 bg-[#001489] hover:bg-[#001489]/90 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm w-full md:w-auto shrink-0 transition-transform active:scale-95"
                    onClick={() => toast.info("Batch update feature coming soon...")}
                >
                    Set
                </Button>
            </div>

            {/* Results Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                            Ongoing List
                            <span className="bg-[#001489]/10 text-[#001489] px-2 py-0.5 rounded-full text-[9px] ml-2">{results.length}</span>
                        </h3>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={results.length === 0}
                        onClick={exportToExcel}
                        className="h-7 px-3 rounded-md text-[9px] font-bold uppercase tracking-wider text-slate-500 border-slate-200 hover:bg-[#001489] hover:text-white transition-all shadow-sm"
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
                                    <th className="px-3 py-2 border-b border-slate-200 w-10 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedRows.size === results.length && results.length > 0}
                                            onChange={e => {
                                                if (e.target.checked) setSelectedRows(new Set(results.map(r => r.ISID)));
                                                else setSelectedRows(new Set());
                                            }}
                                            className="w-3.5 h-3.5 rounded text-[#001489] focus:ring-[#001489]/20" 
                                        />
                                    </th>
                                    {[
                                        { key: 'ISID', label: 'REG NO', color: 'text-[#001489]' },
                                        { key: 'REG_ENGINEER', label: 'RESERVED', color: 'text-slate-400' },
                                        { key: 'NAEM_SUP', label: 'EQPT NAME', color: 'text-slate-950' },
                                        { key: 'MODL', label: 'MODEL', color: 'text-slate-400' },
                                        { key: 'SERN', label: 'SN', color: 'text-slate-400' },
                                        { key: 'STATUS_NAME', label: 'STATE(CAL)', color: 'text-slate-400' },
                                        { key: 'SCHE', label: 'S DATE', color: 'text-emerald-600' },
                                        { key: 'NEXT', label: 'T DATE', color: 'text-rose-600' },
                                        { key: 'APPLICANT', label: 'COMPANY', color: 'text-slate-400' },
                                        { key: 'CALN', label: 'CAL NO', color: 'text-indigo-600' }
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
                                    <tr
                                        key={row.ISID + idx}
                                        onClick={(e) => toggleRow(row.ISID, e)}
                                        className={`hover:bg-[#001489]/5 transition-colors cursor-pointer group ${selectedRows.has(row.ISID) ? 'bg-[#001489]/[0.02]' : ''}`}
                                    >
                                        <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.has(row.ISID)}
                                                onChange={() => toggleRow(row.ISID)}
                                                className="w-3.5 h-3.5 rounded text-[#001489] focus:ring-[#001489]/20"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-[11px] font-black text-slate-900">{row.ISID}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-600">
                                            {row.REG_ENGINEER || "—"}
                                        </td>
                                        <td className="px-3 py-2 text-[11px] font-black text-slate-800">{row.NAEM_SUP}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.MODL}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.SERN}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                row.STATUS_NAME === 'CAL Hold' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {row.STATUS_NAME}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-emerald-600">{formatDate(row.SCHE)}</td>
                                        <td className="px-3 py-2 text-[11px] font-black text-rose-600">{formatDate(row.NEXT)}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-600 truncate max-w-[120px]" title={row.APPLICANT}>{row.APPLICANT}</td>
                                        <td className="px-3 py-2 text-[11px] font-black text-indigo-600">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); downloadReport(row.ISID, row.CALN); }}
                                                className="hover:underline underline-offset-4 decoration-indigo-300 transition-all font-black"
                                            >
                                                {row.CALN || "—"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            {isSearching ? (
                                <Loader2 className="w-8 h-8 text-[#001489] animate-spin mb-4" />
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                        <Search className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 mb-1">No ongoing jobs found</p>
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
