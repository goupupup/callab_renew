import React, { useState } from 'react';
import { Search, Calendar, ChevronDown, CheckSquare, Clock, Download, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Dummy Data
const DUMMY_DATA = Array.from({ length: 15 }, (_, i) => ({
    id: `REQ-2026-${String(i + 1).padStart(3, '0')}`,
    regNo: `HC${String(i + 50).padStart(3, '0')}`,
    reservedPerson: i % 3 === 0 ? "jason so" : "Ricky Wha",
    scheduledDate: "2026-04-15",
    eqptName: i % 2 === 0 ? "THERMOCOUPLE POWER SENSOR" : "SIGNAL GENERATOR",
    model: i % 2 === 0 ? "E4412A" : "N5182B",
    sn: `MY58380${i}03`,
    applicant: "HCT AMERICA, INC",
    calNo: `CAL-26-${String(i + 100).padStart(3, '0')}`,
    state: i % 4 === 0 ? "Hold" : "In Progress",
    recDate: "2026-03-01",
    targetDate: "2026-03-15",
    maker: "KEYSIGHT",
    acc: "Power Cord, Manual",
    division: "HCTA",
    depart: "Calibration"
}));

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

    const toggleRow = (id: string) => {
        const newSet = new Set(selectedRows);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedRows(newSet);
    };

    const handleSearch = () => {
        setIsSearching(true);
        setTimeout(() => {
            setResults(DUMMY_DATA);
            setIsSearching(false);
        }, 600);
    };

    return (
        <div className="space-y-4 w-full animate-in fade-in duration-500">
            {/* Search Condition Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative z-20">
                <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <Search className="w-4 h-4 text-[#001489]" />
                        Search Condition
                    </h3>
                </div>
                <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-5">
                    {/* Row 1 */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">REG NO</label>
                        <Input className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-[#001489] rounded-lg" placeholder="e.g. 1234" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">CAL NO</label>
                        <Input className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-[#001489] rounded-lg" placeholder="e.g. 240401-01" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">APPLICANT</label>
                        <div className="relative">
                            <select className="w-full h-9 bg-slate-50 border border-slate-200 outline-none focus:ring-1 focus:ring-[#001489]/50 rounded-lg px-3 text-xs font-medium text-slate-700 appearance-none">
                                <option value="">All Companies</option>
                                <option value="HCT">HCT AMERICA, INC</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">CONTACT PERSON</label>
                        <Input className="h-9 text-xs bg-slate-50 border-slate-200 focus:border-[#001489] rounded-lg" placeholder="Name" />
                    </div>

                    {/* Row 2 */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">RESERVED ENGINEER</label>
                        <div className="relative">
                            <select className="w-full h-9 bg-slate-50 border border-slate-200 outline-none focus:ring-1 focus:ring-[#001489]/50 rounded-lg px-3 text-xs font-medium text-slate-700 appearance-none">
                                <option value="">Any Engineer</option>
                                <option value="ricky">Ricky Wha</option>
                                <option value="jason">Jason So</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">REC DATE</label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Input type="date" className="h-9 bg-slate-50 border-slate-200 focus:border-[#001489] rounded-lg text-xs px-2" />
                            </div>
                            <span className="text-slate-300 font-bold">~</span>
                            <div className="relative flex-1">
                                <Input type="date" className="h-9 bg-slate-50 border-slate-200 focus:border-[#001489] rounded-lg text-xs px-2" />
                            </div>
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-slate-200 shrink-0 text-slate-500">
                                <Calendar className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Checkboxes Area */}
                    <div className="space-y-3 lg:col-span-4 mt-1 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Type:</span>
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded text-[#001489] focus:ring-[#001489]/20" />
                                    <span className="text-[10px] font-bold text-slate-700 group-hover:text-[#001489] transition-colors">SELF</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <input type="checkbox" className="w-3.5 h-3.5 rounded text-[#001489] focus:ring-[#001489]/20" />
                                    <span className="text-[10px] font-bold text-slate-700 group-hover:text-[#001489] transition-colors">EXTN</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location:</span>
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded text-[#001489] focus:ring-[#001489]/20" />
                                    <span className="text-[10px] font-bold text-slate-700 group-hover:text-[#001489] transition-colors">IN HOUSE</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <input type="checkbox" className="w-3.5 h-3.5 rounded text-[#001489] focus:ring-[#001489]/20" />
                                    <span className="text-[10px] font-bold text-slate-700 group-hover:text-[#001489] transition-colors">ON SITE</span>
                                </label>
                            </div>
                        </div>

                        <Button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="h-10 px-8 bg-[#001489] hover:bg-[#001489]/90 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 transition-all active:scale-95 w-full md:w-auto"
                        >
                            {isSearching ? <span className="animate-pulse">Searching...</span> : "Search"}
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
                            <option value="ricky">Ricky Wha</option>
                            <option value="jason">Jason So</option>
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
                <Button className="h-9 px-6 bg-[#001489] hover:bg-[#001489]/90 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm w-full md:w-auto shrink-0 transition-transform active:scale-95">
                    Set
                </Button>
            </div>

            {/* Results Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                            Ongoing List
                            <span className="bg-[#001489]/10 text-[#001489] px-2 py-0.5 rounded-full text-[9px] ml-2">{results.length}</span>
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
                                    <th className="px-3 py-2 border-b border-slate-200 w-10 text-center">
                                        <input type="checkbox" className="w-3.5 h-3.5 rounded text-[#001489] focus:ring-[#001489]/20" />
                                    </th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">REG NO</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">RESERVED</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-[#001489]">EQPT NAME</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">MODEL</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">STATE(CAL)</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">S DATE</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">T DATE</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">COMPANY</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">MAKER</th>
                                    <th className="px-3 py-2 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">CAL NO</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {results.map((row) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => toggleRow(row.id)}
                                        className={`hover:bg-[#001489]/5 transition-colors cursor-pointer group ${selectedRows.has(row.id) ? 'bg-[#001489]/[0.02]' : ''}`}
                                    >
                                        <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.has(row.id)}
                                                onChange={() => toggleRow(row.id)}
                                                className="w-3.5 h-3.5 rounded text-[#001489] focus:ring-[#001489]/20"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-[11px] font-black text-slate-900">{row.regNo}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-600">
                                            {row.reservedPerson ? (
                                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold">{row.reservedPerson}</span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-slate-800">{row.eqptName}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.model}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${row.state === 'Hold' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                {row.state}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.scheduledDate}</td>
                                        <td className="px-3 py-2 text-[11px] font-bold text-rose-600">{row.targetDate}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-600">{row.applicant}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-500">{row.maker}</td>
                                        <td className="px-3 py-2 text-[11px] font-medium text-slate-400">{row.calNo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                <Search className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-400 mb-1">No ongoing jobs found</p>
                            <p className="text-[11px] font-medium text-slate-400/70">Adjust your search parameters and try again.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
