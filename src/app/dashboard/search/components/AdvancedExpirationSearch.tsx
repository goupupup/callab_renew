import React, { useState } from 'react';
import { Search, Calendar, ChevronDown, Download, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Dummy Data for Expirations
const DUMMY_DATA = Array.from({ length: 8 }, (_, i) => ({
    id: `EXP-${i}`,
    regNo: `HC${String(i + 200).padStart(3, '0')}`,
    calNo: `250210-${String(i + 1).padStart(2, '0')}`,
    certNo: `C-2502-${String(i + 1).padStart(2, '0')}`,
    eqptName: i % 2 === 0 ? "SPECTRUM ANALYZER" : "POWER METER",
    model: i % 2 === 0 ? "N9020A" : "N1911A",
    sn: `MY5000${i}89`,
    manufacturer: "KEYSIGHT",
    applicant: "HCT",
    dueDate: "2026-02-10",
    term: "12",
    contact: "Alice"
}));

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

    const handleSearch = () => {
        setIsSearching(true);
        setTimeout(() => {
            setResults(DUMMY_DATA);
            setIsSearching(false);
        }, 500);
    };

    return (
        <div className="space-y-4 w-full animate-in fade-in duration-500">
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
                            <select className="w-full h-9 bg-white border border-rose-200 outline-none focus:ring-1 focus:ring-rose-500/50 rounded-lg px-3 text-xs font-bold text-slate-700 appearance-none shadow-sm">
                                <option value="">All Companies...</option>
                                <option value="HCT">HCT AMERICA, INC</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-1.5 lg:col-span-1">
                        <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest pl-1">DUE DATE OF CAL</label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Input type="date" className="h-9 bg-white border-rose-200 focus:border-rose-500 rounded-lg text-xs px-2 shadow-sm" />
                            </div>
                            <span className="text-rose-300 font-bold">~</span>
                            <div className="relative flex-1">
                                <Input type="date" className="h-9 bg-white border-rose-200 focus:border-rose-500 rounded-lg text-xs px-2 shadow-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 w-full">
                        <Button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="h-9 w-full bg-rose-600 hover:bg-rose-700 rounded-lg text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-600/20 transition-all active:scale-95"
                        >
                            {isSearching ? <span className="animate-pulse">Searching Expirations...</span> : "Search Expirations"}
                        </Button>
                    </div>

                </div>
            </div>

            {/* Results Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                            Expirations List
                            <span className="bg-rose-600/10 text-rose-600 px-2 py-0.5 rounded-full text-[9px] ml-2">{results.length}</span>
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
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-[#001489]">REG NO</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">CAL NO</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">CERT NO</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-[#001489]">EQPT NAME</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">MODEL</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">MANUFACTURER</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">SN</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">APPLICANT</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-rose-600">DUE DATE</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">TERM</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">CONTACT</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {results.map((row) => (
                                    <tr key={row.id} className="hover:bg-rose-600/5 transition-colors cursor-pointer group">
                                        <td className="px-3 py-2 text-[11px] font-black text-slate-900 group-hover:text-rose-600 transition-colors">{row.regNo}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-600">{row.calNo}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-600">{row.certNo}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-[#001489]">{row.eqptName}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500 bg-slate-50/50">{row.model}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.manufacturer}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.sn}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-600">{row.applicant}</td>
                                        <td className="px-3 py-2 text-[11px] font-black text-rose-600 bg-rose-50/50">{row.dueDate}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-500">{row.term}m</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-600">{row.contact}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6 text-rose-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-400 mb-1">No upcoming expirations</p>
                            <p className="text-[11px] font-medium text-slate-400/70">All equipment calibrations are up to date within the selected range.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
