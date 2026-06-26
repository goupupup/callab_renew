import React, { useState } from 'react';
import { ChevronDown, Download, Wrench, Loader2, ArrowUpDown, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

interface LookupItem {
    CODE: string;
    NAME: string;
}

interface AdvancedModelSearchProps {
    lookups?: {
        types: LookupItem[];
        modes: LookupItem[];
        statuses: LookupItem[];
        suppliers: LookupItem[];
        employees: LookupItem[];
        subcontractors: LookupItem[];
    } | null;
}

export default function AdvancedModelSearch({ lookups }: AdvancedModelSearchProps) {
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null });

    // Filter States
    const [filters, setFilters] = useState({
        cust: "",
        mnfc: "",
        eqptName: "",
        model: "",
        isExact: false,
        memo: ""
    });

    const updateFilter = (key: keyof typeof filters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearch = async () => {
        setIsSearching(true);
        try {
            const params = new URLSearchParams();
            if (filters.cust) params.append("cust", filters.cust);
            if (filters.mnfc) params.append("mnfc", filters.mnfc);
            if (filters.eqptName) params.append("eqptName", filters.eqptName.trim());
            if (filters.model) params.append("model", filters.model.trim());
            if (filters.isExact) params.append("isExact", "true");
            if (filters.memo) params.append("memo", filters.memo.trim());

            const res = await apiFetch(`/api/search/model?${params.toString()}`);
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

    const exportToExcel = () => {
        if (results.length === 0) return;
        const headers = ["REG NO", "EQPT NAME", "MODEL", "MANUFACTURER", "SN", "APPLICANT", "LATEST CAL", "TERM", "SELF", "MODE", "MEMO"];
        const csvRows = [headers.join(",")];
        
        results.forEach(r => {
            const row = [
                r.ISID, 
                `"${(r.NAEM_SUP || "").replace(/"/g, '""')}"`, 
                `"${(r.MODL || "").replace(/"/g, '""')}"`, 
                `"${(r.MNFC_NAME || "").replace(/"/g, '""')}"`, 
                `"${(r.SERN || "").replace(/"/g, '""')}"`, 
                `"${(r.CUST_NAME || "").replace(/"/g, '""')}"`, 
                formatDate(r.LAST), 
                r.TERM ? `${r.TERM}m` : "", 
                r.SELF || "", 
                `"${(r.MODE_DESC || "").replace(/"/g, '""')}"`, 
                `"${(r.MEMO || "").replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(","));
        });

        const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Model_Search_Results_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
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
            ? <ChevronUp className="w-3 h-3 ml-1 text-amber-500" /> 
            : <ChevronDown className="w-3 h-3 ml-1 text-amber-500" />;
    };

    return (
        <div className="space-y-4 w-full animate-in fade-in duration-500">
            {/* Search Condition Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative z-20">
                <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600 flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        Model Search Condition
                    </h3>
                </div>
                <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-5">
                    {/* Row 1 */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">APPLICANT</label>
                        <SearchableDropdown 
                            options={lookups?.suppliers || []}
                            value={filters.cust}
                            onChange={(v) => updateFilter("cust", v)}
                            placeholder="All Companies"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">MANUFACTURER</label>
                        <SearchableDropdown 
                            options={lookups?.suppliers || []}
                            value={filters.mnfc}
                            onChange={(v) => updateFilter("mnfc", v)}
                            placeholder="Select Maker"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">EQPT NAME</label>
                        <Input 
                            value={filters.eqptName}
                            onChange={(e) => updateFilter("eqptName", e.target.value)}
                            className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-amber-500 rounded-lg" 
                            placeholder="Equipment Name" 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between pl-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">MODEL</label>
                            <label className="flex items-center gap-1.5 cursor-pointer group leading-none">
                                <input 
                                    type="checkbox" 
                                    checked={filters.isExact}
                                    onChange={(e) => updateFilter("isExact", e.target.checked)}
                                    className="w-3 h-3 rounded text-amber-500 focus:ring-amber-500/20 shadow-none border-slate-300 transition-all pointer-events-auto" 
                                />
                                <span className="text-[9px] font-bold text-slate-400 group-hover:text-amber-600 transition-colors uppercase">Exact</span>
                            </label>
                        </div>
                        <Input 
                            value={filters.model}
                            onChange={(e) => updateFilter("model", e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-amber-500 rounded-lg placeholder:text-slate-300" 
                            placeholder="Model No." 
                        />
                    </div>

                    {/* Row 2 */}
                    <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">MEMO</label>
                        <Input 
                            value={filters.memo}
                            onChange={(e) => updateFilter("memo", e.target.value)}
                            className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-amber-500 rounded-lg" 
                            placeholder="Search by memo..." 
                        />
                    </div>
                    <div className="flex items-end lg:col-span-2">
                        <Button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="h-9 w-full bg-amber-500 hover:bg-amber-600 rounded-lg text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search Equipment"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                            Model Search Results
                            <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-[9px] ml-2">{results.length}</span>
                        </h3>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={results.length === 0}
                        onClick={exportToExcel}
                        className="h-7 px-3 rounded-md text-[9px] font-bold uppercase tracking-wider text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600 transition-all shadow-sm"
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
                                        { key: 'ISID', label: 'REG NO' },
                                        { key: 'NAEM_SUP', label: 'EQPT NAME' },
                                        { key: 'MODL', label: 'MODEL' },
                                        { key: 'MNFC_NAME', label: 'MANUFACTURER' },
                                        { key: 'SERN', label: 'SN' },
                                        { key: 'CUST_NAME', label: 'APPLICANT' },
                                        { key: 'LAST', label: 'LATEST CAL' },
                                        { key: 'TERM', label: 'TERM' },
                                        { key: 'SELF', label: 'SELF' },
                                        { key: 'MODE_DESC', label: 'MODE' },
                                        { key: 'MEMO', label: 'MEMO' }
                                    ].map(col => (
                                        <th 
                                            key={col.key}
                                            onClick={() => requestSort(col.key)}
                                            className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-[#001489] cursor-pointer group hover:bg-slate-100 transition-colors"
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
                                {sortedResults.map((row) => (
                                    <tr key={row.ISID} className="hover:bg-amber-500/5 transition-colors cursor-pointer group">
                                        <td className="px-3 py-2 text-[11px] font-black text-slate-900 group-hover:text-amber-600 transition-colors">{row.ISID}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-800">{row.NAEM_SUP}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-amber-600 bg-amber-500/5 uppercase">{row.MODL}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.MNFC_NAME}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.SERN}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-600">{row.CUST_NAME}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{formatDate(row.LAST)}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-400">{row.TERM ? `${row.TERM}m` : "—"}</td>
                                        <td className="px-3 py-2 text-[11px] font-black text-rose-500 tracking-widest uppercase">{row.SELF}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-400">{row.MODE_DESC}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-400 truncate max-w-[200px]">{row.MEMO}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                <Wrench className="w-6 h-6 text-amber-200" />
                            </div>
                            <p className="text-sm font-bold text-slate-400 mb-1">No equipment found for this model</p>
                            <p className="text-[11px] font-medium text-slate-400/70">Check your spelling or try searching without exact match.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SearchableDropdown({ options, value, onChange, placeholder }: { 
    options: LookupItem[]; 
    value: string; 
    onChange: (v: string) => void;
    placeholder: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    
    const displayValue = options.find(o => o.CODE === value)?.NAME || "";

    const filtered = options.filter(o => 
        o.NAME.toLowerCase().includes(search.toLowerCase()) || 
        o.CODE.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative group">
            <div className="relative">
                <Input 
                    value={isOpen ? search : displayValue}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        setSearch("");
                    }}
                    className="h-9 pr-8 text-xs bg-slate-50 border-slate-200 focus:border-amber-500 rounded-lg placeholder:text-slate-300 font-medium"
                    placeholder={placeholder}
                />
                <button 
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-md transition-all"
                >
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            <button 
                                type="button"
                                onClick={() => { onChange(""); setIsOpen(false); }}
                                className="w-full px-4 py-2.5 text-left text-xs text-slate-400 hover:bg-slate-50 transition-colors italic border-b border-slate-50"
                            >
                                Clear Selection
                            </button>
                            {filtered.slice(0, 100).map((o) => (
                                <button
                                    type="button"
                                    key={o.CODE}
                                    onClick={() => {
                                        onChange(o.CODE);
                                        setIsOpen(false);
                                        setSearch("");
                                    }}
                                    className={`w-full px-4 py-2.5 text-left text-[11px] transition-colors border-b border-slate-50 last:border-0 ${
                                        value === o.CODE ? "bg-amber-50 text-amber-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="truncate pr-2">{o.NAME}</span>
                                        <span className="text-[9px] font-black text-slate-300 uppercase shrink-0">{o.CODE}</span>
                                    </div>
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <div className="px-4 py-6 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                    No matches found
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f8fafc; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #f59e0b; }
            `}</style>
        </div>
    );
}
