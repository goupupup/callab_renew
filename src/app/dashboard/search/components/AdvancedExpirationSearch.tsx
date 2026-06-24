import React, { useState } from 'react';
import { Search, Calendar, ChevronDown, Download, AlertTriangle, ArrowUpDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SearchableDropdown } from './SearchableDropdown';
import { apiFetch } from "@/lib/api-client";

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
        if (!filters.dueDateStart && !filters.dueDateEnd) {
            toast.error("Please enter the due date of cal");
            return;
        }

        setIsSearching(true);
        try {
            const params = new URLSearchParams({
                applicant: filters.applicant,
                startDate: filters.dueDateStart,
                endDate: filters.dueDateEnd
            });

            const res = await apiFetch(`/api/search/expirations?${params.toString()}`);
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
        const headers = ["REGNO", "EQPT", "MODEL", "MAKER", "SN", "APPLICANT", "LAST_CAL", "DUE_DATE", "TERM", "MODE_NAME", "LAST_NAM", "LOCATION"];
        const csvRows = [headers.join(",")];
        
        results.forEach(r => {
            const row = [
                r.ISID, `"${(r.NAEM_SUP || "").replace(/"/g, '""')}"`, r.MODL || "", 
                r.MANUFACTURE || "", r.SERN || "", `"${(r.APPLICANT || "").replace(/"/g, '""')}"`,
                r.LAST || "", r.NEXT || "", r.TERM || "", r.MODE_NAME || "", 
                r.LAST_NAM || "", r.LOCATION || ""
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
            <div className="bg-white rounded-2xl border border-rose-200/60 shadow-sm relative z-20 flex flex-col xl:flex-row overflow-visible">
                <div className="p-3 md:p-4 xl:p-5 border-b xl:border-b-0 xl:border-r border-rose-100 bg-rose-50/30 flex flex-col justify-center xl:w-48 shrink-0">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600 flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        Next Cal Date
                    </h3>
                    <p className="text-[10px] font-bold text-rose-400 leading-tight">Expiration Tracking Engine</p>
                </div>

                <div className="p-4 md:p-5 xl:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-x-5 md:gap-y-4 flex-1 items-end overflow-visible">
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest pl-1">APPLICANT</label>
                        <SearchableDropdown 
                            options={lookups?.suppliers || []}
                            value={filters.applicant}
                            onChange={(v) => updateFilter("applicant", v)}
                            placeholder="Select Company..."
                        />
                    </div>

                    <div className="space-y-1.5">
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

                    <div className="w-full">
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
                                        { key: 'NAEM_SUP', label: 'EQPT NAME', color: 'text-slate-950' },
                                        { key: 'MODL', label: 'MODEL', color: 'text-slate-400' },
                                        { key: 'MANUFACTURE', label: 'MAKER', color: 'text-slate-400' },
                                        { key: 'SERN', label: 'SN', color: 'text-slate-400' },
                                        { key: 'APPLICANT', label: 'APPLICANT', color: 'text-slate-400' },
                                        { key: 'LAST', label: 'LATEST CAL', color: 'text-slate-400' },
                                        { key: 'NEXT', label: 'DUE DATE', color: 'text-rose-600' },
                                        { key: 'TERM', label: 'TERM', color: 'text-slate-400' },
                                        { key: 'MODE_NAME', label: 'CAL MODE', color: 'text-slate-400' },
                                        { key: 'LAST_NAM', label: 'LAST NAM', color: 'text-slate-400' },
                                        { key: 'LOCATION', label: 'LOCATION', color: 'text-emerald-600' }
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
                                        <td className="px-3 py-2 text-[11px] font-black text-slate-800">{row.NAEM_SUP}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500 bg-slate-50/50">{row.MODL}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.MANUFACTURE}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.SERN}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-600">{row.APPLICANT}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-400">{formatDate(row.LAST)}</td>
                                        <td className="px-3 py-2 text-[11px] font-black text-rose-600 bg-rose-50/50">{formatDate(row.NEXT)}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-500">{row.TERM}m</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-600">{row.MODE_NAME || "—"}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-600">{row.LAST_NAM || "—"}</td>
                                        <td className="px-3 py-2 text-[11px] font-black text-emerald-600 italic uppercase">{row.LOCATION || "—"}</td>
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
