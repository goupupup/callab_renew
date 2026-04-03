import React, { useState } from 'react';
import { Search, Calendar, ChevronDown, Download, History, Loader2, AlertTriangle, X, ArrowUpDown, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SearchableDropdown } from './SearchableDropdown';

interface LookupItem {
    CODE: string;
    NAME: string;
}

interface AdvancedCalNoSearchProps {
    lookups?: {
        types: LookupItem[];
        modes: LookupItem[];
        statuses: LookupItem[];
        suppliers: LookupItem[];
        employees: LookupItem[];
        subcontractors: LookupItem[];
    } | null;
}

export default function AdvancedCalNoSearch({ lookups }: AdvancedCalNoSearchProps) {
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null });

    // Filter States
    const [filters, setFilters] = useState({
        isid: "",
        calNo: "",
        asset: "",
        certNo: "",
        ccom: "",
        mnfc: "",
        emid: "",
        state: "",
        recStart: "",
        recEnd: "",
        calStart: "",
        calEnd: "",
        retStart: "",
        retEnd: "",
        inHouse: true,
        onSite: true,
    });

    const updateFilter = (key: keyof typeof filters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearch = async () => {
        setIsSearching(true);
        try {
            const params = new URLSearchParams({ mode: "advancedCalHistory" });
            if (filters.isid) params.append("isid", filters.isid.trim());
            if (filters.calNo) params.append("calNo", filters.calNo.trim());
            if (filters.asset) params.append("asset", filters.asset.trim());
            if (filters.certNo) params.append("certNo", filters.certNo.trim());
            if (filters.ccom) params.append("ccom", filters.ccom);
            if (filters.mnfc) params.append("mnfc", filters.mnfc);
            if (filters.emid) params.append("emid", filters.emid);
            if (filters.state) params.append("state", filters.state);

            if (filters.recStart) params.append("recStart", filters.recStart);
            if (filters.recEnd) params.append("recEnd", filters.recEnd);
            if (filters.calStart) params.append("calStart", filters.calStart);
            if (filters.calEnd) params.append("calEnd", filters.calEnd);
            if (filters.retStart) params.append("retStart", filters.retStart);
            if (filters.retEnd) params.append("retEnd", filters.retEnd);

            params.append("inHouse", filters.inHouse.toString());
            params.append("onSite", filters.onSite.toString());

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

    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr === '0' || dateStr.length !== 8) return "—";
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
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
            const aVal = a[sortConfig.key] || '';
            const bVal = b[sortConfig.key] || '';

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [results, sortConfig]);

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' 
            ? <ChevronUp className="w-3 h-3 ml-1 text-indigo-500" /> 
            : <ChevronDown className="w-3 h-3 ml-1 text-indigo-500" />;
    };

    const exportToExcel = () => {
        if (results.length === 0) return;
        const headers = ["REGNO", "CALNO", "CERT NO", "STATE(CAL)", "APPLICANT", "EQIP NAME", "MODEL", "SN", "MANUFACTURER", "ASSET", "REC DATE", "CAL DATE", "APPV DATE", "DUE DATE", "TERM", "RET DATE", "REC TYPE", "CAL TYPE", "CONTACT"];
        const csvRows = [headers.join(",")];
        
        results.forEach(r => {
            const row = [
                r.ISID, r.CIDU, r.CERTNO || "", r.STATUS_NAME || "", 
                `"${(r.APPLICANT || "").replace(/"/g, '""')}"`, 
                `"${(r.EQIP_NAME || "").replace(/"/g, '""')}"`, 
                r.MODEL, r.SN || "", r.MNFC_NAME || "", r.ASSET || "",
                r.REC_DATE, r.CAL_DATE, r.APPV_DATE, r.DUE_DATE, r.TERM, r.RET_DATE,
                r.REC_TYPE, r.CAL_TYPE, r.CONTACT || ""
            ];
            csvRows.push(row.join(","));
        });

        const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Calibration_Search_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 w-full animate-in fade-in duration-500">
            {/* Search Condition Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative z-20 flex flex-col xl:flex-row">
                <div className="p-3 md:p-4 xl:p-5 border-b xl:border-b-0 xl:border-r border-slate-100 bg-slate-50/50 flex flex-col justify-center xl:w-40 shrink-0">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-2 mb-1">
                        <History className="w-4 h-4" />
                        CAL NO
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 leading-tight">Calibration History Search Engine</p>
                </div>

                <div className="p-4 grid grid-cols-[auto_1fr_auto_1.5fr_auto_1.5fr_auto] gap-x-3 gap-y-2 items-center flex-1 overflow-visible">
                    {/* Row 0 */}
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">REGNO :</label>
                    <Input 
                        value={filters.isid}
                        onChange={(e) => updateFilter("isid", e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="h-8 text-[11px] bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-md" 
                    />
                    
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">REC DATE :</label>
                    <div className="flex items-center gap-1">
                        <Input 
                            type="date" 
                            value={filters.recStart}
                            onChange={(e) => updateFilter("recStart", e.target.value)}
                            className="h-8 flex-1 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-md text-[11px] px-1" 
                        />
                        <span className="text-slate-300">~</span>
                        <Input 
                            type="date" 
                            value={filters.recEnd}
                            onChange={(e) => updateFilter("recEnd", e.target.value)}
                            className="h-8 flex-1 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-md text-[11px] px-1" 
                        />
                    </div>

                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">APPLICANT :</label>
                    <SearchableDropdown 
                        options={lookups?.suppliers || []}
                        value={filters.ccom}
                        onChange={(v) => updateFilter("ccom", v)}
                        placeholder=""
                    />
                    <div />

                    {/* Row 1 */}
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">CALNO :</label>
                    <Input 
                        value={filters.calNo}
                        onChange={(e) => updateFilter("calNo", e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="h-8 text-[11px] bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-md" 
                    />

                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">CAL DATE :</label>
                    <div className="flex items-center gap-1">
                        <Input 
                            type="date" 
                            value={filters.calStart}
                            onChange={(e) => updateFilter("calStart", e.target.value)}
                            className="h-8 flex-1 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-md text-[11px] px-1" 
                        />
                        <span className="text-slate-300">~</span>
                        <Input 
                            type="date" 
                            value={filters.calEnd}
                            onChange={(e) => updateFilter("calEnd", e.target.value)}
                            className="h-8 flex-1 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-md text-[11px] px-1" 
                        />
                    </div>

                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">ENGINEER :</label>
                    <SearchableDropdown 
                        options={lookups?.employees || []}
                        value={filters.emid}
                        onChange={(v) => updateFilter("emid", v)}
                        placeholder=""
                    />
                    <div />

                    {/* Row 2 */}
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">ASSET :</label>
                    <Input 
                        value={filters.asset}
                        onChange={(e) => updateFilter("asset", e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="h-8 text-[11px] bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-md" 
                    />

                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">RET DATE :</label>
                    <div className="flex items-center gap-1">
                        <Input 
                            type="date" 
                            value={filters.retStart}
                            onChange={(e) => updateFilter("retStart", e.target.value)}
                            className="h-8 flex-1 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-md text-[11px] px-1" 
                        />
                        <span className="text-slate-300">~</span>
                        <Input 
                            type="date" 
                            value={filters.retEnd}
                            onChange={(e) => updateFilter("retEnd", e.target.value)}
                            className="h-8 flex-1 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-md text-[11px] px-1" 
                        />
                    </div>

                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">MANUFACTURER :</label>
                    <SearchableDropdown 
                        options={lookups?.suppliers || []}
                        value={filters.mnfc}
                        onChange={(v) => updateFilter("mnfc", v)}
                        placeholder=""
                    />
                    <div />

                    {/* Row 3 */}
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">CERT NO :</label>
                    <Input 
                        value={filters.certNo}
                        onChange={(e) => updateFilter("certNo", e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="h-8 text-[11px] bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-md" 
                    />

                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">STATE :</label>
                    <div className="relative">
                        <select 
                            value={filters.state}
                            onChange={(e) => updateFilter("state", e.target.value)}
                            className="w-full h-8 bg-slate-50 border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500/50 rounded-md px-2 text-[11px] font-medium text-slate-700 appearance-none"
                        >
                            <option value=""></option>
                            {lookups?.statuses.map(s => (
                                <option key={s.CODE} value={s.CODE}>{s.NAME}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                    </div>

                    <div className="col-span-2 flex items-center gap-4 bg-slate-100/50 px-3 py-1 rounded-md border border-slate-100 h-8 self-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IN HOUSE/ON SITE :</span>
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={filters.inHouse}
                                onChange={(e) => updateFilter("inHouse", e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-600/20" 
                            />
                            <span className="text-[9px] font-bold text-slate-600 group-hover:text-indigo-600 transition-colors uppercase">IN HOUSE</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={filters.onSite}
                                onChange={(e) => updateFilter("onSite", e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-600/20" 
                            />
                            <span className="text-[9px] font-bold text-slate-600 group-hover:text-indigo-600 transition-colors uppercase">ON SITE</span>
                        </label>
                    </div>

                    <Button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="h-8 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-md text-[10px] font-black uppercase tracking-[0.2em] shadow-md shadow-indigo-600/10 transition-all active:scale-95 whitespace-nowrap"
                    >
                        {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "SEARCH"}
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                        CAL/REP HISTORY
                        <span className="bg-indigo-600/10 text-indigo-600 px-2 py-0.5 rounded-full text-[9px] ml-2">{results.length}</span>
                    </h3>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={results.length === 0}
                        onClick={exportToExcel}
                        className="h-7 px-3 rounded-md text-[9px] font-bold uppercase tracking-wider text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm"
                    >
                        <Download className="w-3 h-3 mr-1.5" />
                        Export
                    </Button>
                </div>

                <div className="flex-1 overflow-auto max-h-[600px] custom-scrollbar relative">
                    {results.length > 0 ? (
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                                <tr>
                                    {[
                                        { key: 'ISID', label: 'REGNO', color: 'text-indigo-600' },
                                        { key: 'CIDU', label: 'CALNO', color: 'text-slate-400' },
                                        { key: 'CERTNO', label: 'CERT NO', color: 'text-slate-400' },
                                        { key: 'STATUS_NAME', label: 'STATE(CAL)', color: 'text-slate-400', align: 'center' },
                                        { key: 'APPLICANT', label: 'APPLICANT', color: 'text-slate-400' },
                                        { key: 'EQIP_NAME', label: 'EQIP NAME', color: 'text-[#001489]' },
                                        { key: 'MODEL', label: 'MODEL', color: 'text-slate-400' },
                                        { key: 'SN', label: 'SN', color: 'text-slate-400' },
                                        { key: 'MNFC_NAME', label: 'MANUFACTURER', color: 'text-slate-400' },
                                        { key: 'ASSET', label: 'ASSET', color: 'text-slate-400' },
                                        { key: 'REC_DATE', label: 'REC DATE', color: 'text-slate-400' },
                                        { key: 'CAL_DATE', label: 'CAL DATE', color: 'text-emerald-600' },
                                        { key: 'APPV_DATE', label: 'APPV DATE', color: 'text-slate-400' },
                                        { key: 'DUE_DATE', label: 'DUE DATE', color: 'text-rose-600' },
                                        { key: 'TERM', label: 'TERM', color: 'text-slate-400' },
                                        { key: 'RET_DATE', label: 'RET DATE', color: 'text-slate-400' },
                                        { key: 'REC_TYPE', label: 'REC TYPE', color: 'text-slate-400' },
                                        { key: 'CAL_TYPE', label: 'CAL TYPE', color: 'text-slate-400' },
                                        { key: 'CONTACT', label: 'CONTACT', color: 'text-slate-400' },
                                        { key: 'CANCEL_RSN', label: 'CANCEL REASON', color: 'text-slate-400' }
                                    ].map(col => (
                                        <th 
                                            key={col.key}
                                            onClick={() => requestSort(col.key)}
                                            className={`px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest ${col.color} cursor-pointer group hover:bg-slate-100 transition-colors ${col.align === 'center' ? 'text-center' : ''}`}
                                        >
                                            <div className={`flex items-center ${col.align === 'center' ? 'justify-center' : ''}`}>
                                                {col.label}
                                                <SortIcon columnKey={col.key} />
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {sortedResults.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-indigo-600/5 transition-colors cursor-pointer group">
                                        <td className="px-3 py-2 text-[11px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase select-all">{row.ISID}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-600 uppercase">
                                            <button 
                                                onClick={() => downloadReport(row.ISID, row.CIDU)}
                                                className="flex items-center gap-1.5 hover:text-indigo-600 hover:underline underline-offset-4 decoration-indigo-300 transition-all font-black text-[#001489]"
                                            >
                                                <Download className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600" />
                                                {row.CIDU}
                                            </button>
                                        </td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-400">{row.CERTNO || "—"}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider ${
                                                row.STATUS_NAME === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                                {row.STATUS_NAME || "OK"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-[11px] text-slate-600 truncate max-w-[120px]" title={row.APPLICANT}>{row.APPLICANT || "—"}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-[#001489] bg-slate-50/50">{row.EQIP_NAME}</td>
                                        <td className="px-3 py-2 text-[11px] text-slate-500">{row.MODEL}</td>
                                        <td className="px-3 py-2 text-[11px] text-slate-500">{row.SN || "—"}</td>
                                        <td className="px-3 py-2 text-[11px] text-slate-500">{row.MNFC_NAME || "—"}</td>
                                        <td className="px-3 py-2 text-[11px] text-slate-500">{row.ASSET || "—"}</td>
                                        <td className="px-3 py-2 text-[11px] text-slate-400">{formatDate(row.REC_DATE)}</td>
                                        <td className="px-3 py-2 text-[11px] font-black text-emerald-600 bg-emerald-50/50">{formatDate(row.CAL_DATE)}</td>
                                        <td className="px-3 py-2 text-[11px] text-slate-400">{formatDate(row.APPV_DATE)}</td>
                                        <td className="px-3 py-2 text-[11px] font-black text-rose-600 bg-rose-50/50">{formatDate(row.DUE_DATE)}</td>
                                        <td className="px-3 py-2 text-[11px] text-slate-500">{row.TERM ? `${row.TERM}m` : "—"}</td>
                                        <td className="px-3 py-2 text-[11px] text-slate-400">{formatDate(row.RET_DATE)}</td>
                                        <td className="px-3 py-2 text-[11px] text-slate-500">{row.REC_TYPE || "—"}</td>
                                        <td className="px-3 py-2 text-[11px] text-slate-500">{row.CAL_TYPE || "—"}</td>
                                        <td className="px-3 py-2 text-[11px] text-slate-500">{row.CONTACT || "—"}</td>
                                        <td className="px-3 py-2 text-[11px] text-slate-400 italic truncate max-w-[150px]" title={row.CANCEL_RSN}>{row.CANCEL_RSN || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                <History className="w-6 h-6 text-indigo-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-400 mb-1">No history found</p>
                            <p className="text-[11px] font-medium text-slate-400/70">Modify your search filters to view calibration records.</p>
                        </div>
                    )}
                </div>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f8fafc; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6366f1; }
            `}</style>
        </div>
    );
}
