import React, { useState } from 'react';
import { Search, Calendar, ChevronDown, Download, History, Loader2, AlertTriangle, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

    // Filter States
    const [filters, setFilters] = useState({
        isid: "",
        calNo: "",
        asset: "",
        certNo: "",
        ccom: "",
        mnfc: "",
        emid: "",
        calCls: "",
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
            const params = new URLSearchParams({ mode: "advancedHistory" });
            if (filters.isid) params.append("isid", filters.isid.trim());
            if (filters.calNo) params.append("calNo", filters.calNo.trim());
            if (filters.asset) params.append("asset", filters.asset.trim());
            if (filters.certNo) params.append("certNo", filters.certNo.trim());
            if (filters.ccom) params.append("ccom", filters.ccom);
            if (filters.mnfc) params.append("mnfc", filters.mnfc);
            if (filters.emid) params.append("emid", filters.emid);
            if (filters.calCls) params.append("calCls", filters.calCls);

            // Date formatting
            const formatDateForBackend = (dateStr: string) => {
                if (!dateStr) return "";
                const [y, m, d] = dateStr.split("-");
                return `${m}${d}${y}`;
            };

            if (filters.recStart) params.append("recStart", formatDateForBackend(filters.recStart));
            if (filters.recEnd) params.append("recEnd", formatDateForBackend(filters.recEnd));
            if (filters.calStart) params.append("calStart", formatDateForBackend(filters.calStart));
            if (filters.calEnd) params.append("calEnd", formatDateForBackend(filters.calEnd));
            if (filters.retStart) params.append("retStart", formatDateForBackend(filters.retStart));
            if (filters.retEnd) params.append("retEnd", formatDateForBackend(filters.retEnd));

            // Logic: Site Type
            let onsite = "";
            if (filters.inHouse && filters.onSite) {
                onsite = "";
            } else {
                onsite = filters.onSite ? "A" : "B";
            }
            if (onsite) params.append("onsite", onsite);

            const res = await fetch(`/api/search?${params.toString()}`);
            if (!res.ok) throw new Error("Search failed");
            const data = await res.json();
            setResults(data);
        } catch (error) {
            console.error("Search error:", error);
            alert("Search failed. Please check your connection.");
        } finally {
            setIsSearching(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr === '0' || dateStr.length !== 8) return "—";
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
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

                <div className="p-4 md:p-5 xl:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-x-4 md:gap-y-4 flex-1">
                    {/* Basic Fields */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">REG NO</label>
                        <Input 
                            value={filters.isid}
                            onChange={(e) => updateFilter("isid", e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg placeholder:text-slate-300" 
                            placeholder="e.g. 1234" 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">CAL NO</label>
                        <Input 
                            value={filters.calNo}
                            onChange={(e) => updateFilter("calNo", e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg placeholder:text-slate-300" 
                            placeholder="e.g. 240401-01" 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">ASSET</label>
                        <Input 
                            value={filters.asset}
                            onChange={(e) => updateFilter("asset", e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg placeholder:text-slate-300" 
                            placeholder="Asset No." 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">CERT NO</label>
                        <Input 
                            value={filters.certNo}
                            onChange={(e) => updateFilter("certNo", e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg placeholder:text-slate-300" 
                            placeholder="Cert No." 
                        />
                    </div>

                    {/* Searchable Comboboxes */}
                    <div className="space-y-1.5 xl:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">APPLICANT</label>
                        <SearchableDropdown 
                            options={lookups?.suppliers || []}
                            value={filters.ccom}
                            onChange={(v) => updateFilter("ccom", v)}
                            placeholder="Type to search company..."
                        />
                    </div>

                    <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">MANUFACTURER</label>
                        <SearchableDropdown 
                            options={lookups?.suppliers || []}
                            value={filters.mnfc}
                            onChange={(v) => updateFilter("mnfc", v)}
                            placeholder="Type to search maker..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">ENGINEER</label>
                        <SearchableDropdown 
                            options={lookups?.employees || []}
                            value={filters.emid}
                            onChange={(v) => updateFilter("emid", v)}
                            placeholder="Any Engineer"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">CATEGORY</label>
                        <div className="relative">
                            <select 
                                value={filters.calCls}
                                onChange={(e) => updateFilter("calCls", e.target.value)}
                                className="w-full h-9 bg-slate-50 border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500/50 rounded-lg px-3 text-xs font-medium text-slate-700 appearance-none"
                            >
                                <option value="">Any</option>
                                {lookups?.types.map(t => (
                                    <option key={t.CODE} value={t.CODE}>{t.NAME}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>


                    {/* Date Ranges */}
                    <div className="space-y-1.5 xl:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">REC DATE</label>
                        <div className="flex items-center gap-2">
                            <Input 
                                type="date" 
                                value={filters.recStart}
                                onChange={(e) => updateFilter("recStart", e.target.value)}
                                className="h-9 flex-1 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg text-[11px] px-2" 
                            />
                            <span className="text-slate-300 font-bold">~</span>
                            <Input 
                                type="date" 
                                value={filters.recEnd}
                                onChange={(e) => updateFilter("recEnd", e.target.value)}
                                className="h-9 flex-1 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg text-[11px] px-2" 
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5 xl:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">CAL DATE</label>
                        <div className="flex items-center gap-2">
                            <Input 
                                type="date" 
                                value={filters.calStart}
                                onChange={(e) => updateFilter("calStart", e.target.value)}
                                className="h-9 flex-1 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg text-[11px] px-2" 
                            />
                            <span className="text-slate-300 font-bold">~</span>
                            <Input 
                                type="date" 
                                value={filters.calEnd}
                                onChange={(e) => updateFilter("calEnd", e.target.value)}
                                className="h-9 flex-1 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg text-[11px] px-2" 
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5 xl:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">RET DATE</label>
                        <div className="flex items-center gap-2">
                            <Input 
                                type="date" 
                                value={filters.retStart}
                                onChange={(e) => updateFilter("retStart", e.target.value)}
                                className="h-9 flex-1 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg text-[11px] px-2" 
                            />
                            <span className="text-slate-300 font-bold">~</span>
                            <Input 
                                type="date" 
                                value={filters.retEnd}
                                onChange={(e) => updateFilter("retEnd", e.target.value)}
                                className="h-9 flex-1 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg text-[11px] px-2" 
                            />
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="xl:col-span-6 flex flex-col md:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100 mt-1">
                        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Site Type:</span>
                            <label className="flex items-center gap-1.5 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={filters.inHouse}
                                    onChange={(e) => updateFilter("inHouse", e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-600/20" 
                                />
                                <span className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">IN HOUSE</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={filters.onSite}
                                    onChange={(e) => updateFilter("onSite", e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-600/20" 
                                />
                                <span className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">ON SITE</span>
                            </label>
                        </div>

                        <Button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="h-10 px-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 transition-all active:scale-95 w-full md:w-auto"
                        >
                            {isSearching ? <span className="animate-pulse flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...</span> : "Search History"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                            CAL / REP History
                            <span className="bg-indigo-600/10 text-indigo-600 px-2 py-0.5 rounded-full text-[9px] ml-2">{results.length}</span>
                        </h3>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 px-3 rounded-md text-[9px] font-bold uppercase tracking-wider text-slate-500 border-slate-200">
                        <Download className="w-3 h-3 mr-1.5" />
                        Export
                    </Button>
                </div>

                <div className="flex-1 overflow-auto max-h-[600px] custom-scrollbar relative">
                    {results.length > 0 ? (
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-indigo-600">REG NO</th>
                                    <th className="px-4 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">CAL NO</th>
                                    <th className="px-4 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">CERT NO</th>
                                    <th className="px-4 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">STATE</th>
                                    <th className="px-4 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-[#001489]">EQPT NAME</th>
                                    <th className="px-4 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">MODEL</th>
                                    <th className="px-4 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">APPLICANT</th>
                                    <th className="px-4 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-emerald-600 text-center">CAL DATE</th>
                                    <th className="px-4 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-rose-600 text-center">DUE DATE</th>
                                    <th className="px-4 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">REC DATE</th>
                                    <th className="px-4 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">RET DATE</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {results.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-indigo-600/5 transition-colors cursor-pointer group">
                                        <td className="px-4 py-2 text-[11px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{row.ISID}</td>
                                        <td className="px-4 py-2 text-[11px] font-bold text-slate-600 uppercase">{row.CIDU}</td>
                                        <td className="px-4 py-2 text-[11px] font-bold text-slate-400">{row.KOLAS_NO || "—"}</td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider ${
                                                row.STATUS_NAME === 'CANCEL' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                                {row.STATUS_NAME || "OK"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-[11px] font-bold text-[#001489] bg-slate-50/50">{row.NAEM_SUP}</td>
                                        <td className="px-4 py-2 text-[11px] text-slate-500">{row.MODL}</td>
                                        <td className="px-4 py-2 text-[11px] text-slate-600 text-center truncate max-w-[120px]" title={row.CUSTOMER_NAME}>{row.CUSTOMER_NAME || "—"}</td>
                                        <td className="px-4 py-2 text-[11px] font-black text-emerald-600 bg-emerald-50/50 text-center">{formatDate(row.CARD)}</td>
                                        <td className="px-4 py-2 text-[11px] font-black text-rose-600 bg-rose-50/50 text-center">{formatDate(row.NEXT)}</td>
                                        <td className="px-4 py-2 text-[11px] text-slate-400 text-center">{formatDate(row.CASD)}</td>
                                        <td className="px-4 py-2 text-[11px] text-slate-400 text-center">{formatDate(row.ROTD)}</td>
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
                .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6366f133; }
            `}</style>
        </div>
    );
}

// Searchable Dropdown Sub-component
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
                    className="h-9 pr-8 text-xs bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg placeholder:text-slate-300 font-medium"
                    placeholder={placeholder}
                />
                <button 
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
                                onClick={() => { onChange(""); setIsOpen(false); }}
                                className="w-full px-4 py-2.5 text-left text-xs text-slate-400 hover:bg-slate-50 transition-colors italic border-b border-slate-50"
                            >
                                Clear Selection
                            </button>
                            {filtered.slice(0, 100).map((o) => (
                                <button
                                    key={o.CODE}
                                    onClick={() => {
                                        onChange(o.CODE);
                                        setIsOpen(false);
                                        setSearch("");
                                    }}
                                    className={`w-full px-4 py-2.5 text-left text-[11px] transition-colors border-b border-slate-50 last:border-0 ${
                                        value === o.CODE ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50"
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
        </div>
    );
}
