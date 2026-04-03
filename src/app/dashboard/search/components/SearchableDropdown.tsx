import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { ChevronDown } from 'lucide-react';

interface LookupItem {
    CODE: string;
    NAME: string;
}

interface SearchableDropdownProps {
    options: LookupItem[];
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
}

export function SearchableDropdown({ options, value, onChange, placeholder, className }: SearchableDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    
    const displayValue = options.find(o => o.CODE === value)?.NAME || "";

    const filtered = options.filter(o => 
        (o.NAME || "").toLowerCase().includes(search.toLowerCase()) || 
        (o.CODE || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={`relative group ${className || ""}`}>
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
                                    key={o.CODE}
                                    type="button"
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
