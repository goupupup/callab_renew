"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SchedulePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [schedules, setSchedules] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        startDate: "",
        endDate: "",
        schType: "PTO",
        division: "#ALL",
        memo: "",
        emid1: "NONE",
        emid2: "NONE",
        emid3: "NONE",
        emid4: "NONE",
        emid5: "NONE"
    });

    const isMaster = (session?.user as any)?.role === "MASTER";
    const canManageSchedules = isMaster;

    useEffect(() => {
        if (session && (session?.user as any)?.role === "USER") {
            router.push("/dashboard");
        }
        fetchData();
    }, [session]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [schedRes, empRes] = await Promise.all([
                fetch("/api/schedule"),
                fetch("/api/schedule?mode=employees")
            ]);

            if (schedRes.ok && empRes.ok) {
                const schedData = await schedRes.json();
                const empData = await empRes.json();
                setSchedules(schedData);
                setEmployees(empData);
            }
        } catch (error) {
            toast.error("Telemetry link failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const loadingToast = toast.loading("Broadcasting status protocol...");
        try {
            const method = editingId ? "PUT" : "POST";
            const submissionData = {
                ...formData,
                emid1: formData.emid1 === "NONE" ? "" : formData.emid1,
                emid2: formData.emid2 === "NONE" ? "" : formData.emid2,
                emid3: formData.emid3 === "NONE" ? "" : formData.emid3,
                emid4: formData.emid4 === "NONE" ? "" : formData.emid4,
                emid5: formData.emid5 === "NONE" ? "" : formData.emid5,
                schId: editingId
            };

            const res = await fetch("/api/schedule", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submissionData)
            });

            if (res.ok) {
                toast.success("Timeline synchronized.", { id: loadingToast });
                setIsFormOpen(false);
                setEditingId(null);
                fetchData();
                resetForm();
            } else {
                toast.error("Failed to commit changes.", { id: loadingToast });
            }
        } catch (error) {
            toast.error("Network synchronization lost.", { id: loadingToast });
        }
    };

    const resetForm = () => {
        setFormData({
            startDate: "", endDate: "", schType: "PTO", division: "#ALL",
            memo: "", emid1: "NONE", emid2: "NONE", emid3: "NONE", emid4: "NONE", emid5: "NONE"
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Confirm schedule termination?")) return;
        try {
            const res = await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Entry purged.");
                fetchData();
                setIsFormOpen(false);
            }
        } catch (error) {
            toast.error("Purge failed.");
        }
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const setToday = () => setCurrentDate(new Date());

    const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const days = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const startsAt = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const getScheduleColor = (type: string) => {
        switch (type) {
            case "PTO": return "bg-rose-500";
            case "HALF PTO": return "bg-amber-500";
            case "CARE LEAVE": return "bg-emerald-500";
            case "B.T": return "bg-[#001489]";
            default: return "bg-slate-500";
        }
    };

    const getEmployeeNames = (item: any) => {
        const ids = [item.EMID1, item.EMID2, item.EMID3, item.EMID4, item.EMID5].filter(Boolean);
        return ids.map(id => employees.find(e => e.ID === id.trim())?.NAME || id).join(", ");
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Page Header */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-l-4 border-[#001489] pl-4 md:pl-8">
                <div>
                    <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 leading-tight mb-2">
                        Status <span className="text-[#001489]">Timeline Manager</span>
                    </h2>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400">
                        Protocol: <span className="text-slate-900 uppercase font-black">EASYCAL.TBSCHMAN</span>
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={setToday}
                        className="rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:text-[#001489] h-10 md:h-12 px-4 md:px-6 w-full sm:w-auto overflow-hidden text-ellipsis whitespace-nowrap"
                    >
                        Jump to Present
                    </Button>
                    <div className="flex items-center bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden h-10 md:h-12 w-full sm:w-auto">
                        <Button variant="ghost" onClick={prevMonth} className="h-full px-3 md:px-4 text-slate-400 hover:text-[#001489] rounded-none">
                            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                        </Button>
                        <span className="flex-1 px-4 md:px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.2em] text-slate-900 border-x border-slate-50 min-w-[120px] md:min-w-[180px] text-center">
                            {monthYear}
                        </span>
                        <Button variant="ghost" onClick={nextMonth} className="h-full px-3 md:px-4 text-slate-400 hover:text-[#001489] rounded-none">
                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                        </Button>
                    </div>
                    {canManageSchedules && (
                        <Button
                            className="bg-[#001489] hover:bg-blue-800 text-white rounded-xl h-10 md:h-12 px-6 md:px-8 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-900/20 flex items-center justify-center space-x-3 transition-all active:scale-95 w-full sm:w-auto"
                            onClick={() => { setEditingId(null); resetForm(); setIsFormOpen(true); }}
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Schedule</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Registration/Edit Form (Dialog/Modal) */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-4xl border-none shadow-2xl bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden p-0 gap-0 w-[calc(100%-1rem)] md:w-full">
                    <DialogHeader className="bg-slate-50/50 p-6 md:p-10 border-b border-slate-100/50">
                        <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-[#001489] flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                                <Edit className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <DialogTitle className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-slate-400">
                                {editingId ? "Update Protocol" : "Broadcast Event"}
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="p-6 md:p-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        <form onSubmit={handleRegisterSubmit} className="space-y-6 md:space-y-10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Date</label>
                                    <Input
                                        type="date"
                                        className="h-12 md:h-14 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] transition-all font-bold text-slate-900 text-xs md:text-base"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">End Date</label>
                                    <Input
                                        type="date"
                                        className="h-12 md:h-14 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] transition-all font-bold text-slate-900 text-xs md:text-base"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Event Type</label>
                                    <Select
                                        onValueChange={(v: string) => setFormData({ ...formData, schType: v })}
                                        value={formData.schType}
                                    >
                                        <SelectTrigger className="h-12 md:h-14 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] font-bold text-slate-900 text-xs md:text-base">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="PTO" className="font-bold">PTO (Full Day)</SelectItem>
                                            <SelectItem value="HALF PTO" className="font-bold">HALF PTO</SelectItem>
                                            <SelectItem value="CARE LEAVE" className="font-bold">Care Leave</SelectItem>
                                            <SelectItem value="B.T" className="font-bold">Business Trip (B.T)</SelectItem>
                                            <SelectItem value="Etc." className="font-bold">Etc. (Miscellaneous)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sector Division</label>
                                    <Input
                                        className="h-12 md:h-14 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] transition-all font-bold text-slate-900 text-xs md:text-base"
                                        value={formData.division}
                                        onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                        placeholder="#ALL"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Operational Brief (Memo)</label>
                                <Input
                                    className="h-12 md:h-14 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] transition-all font-bold text-slate-900 text-xs md:text-base"
                                    value={formData.memo}
                                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                                    placeholder="Enter details..."
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned Personnel</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                                    {[1, 2, 3, 4, 5].map((idx) => (
                                        <Select
                                            key={idx}
                                            // @ts-ignore
                                            onValueChange={(v: string) => setFormData({ ...formData, [`emid${idx}`]: v })}
                                            // @ts-ignore
                                            value={formData[`emid${idx}`]}
                                        >
                                            <SelectTrigger className="h-10 md:h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold text-[10px] md:text-xs text-slate-900">
                                                <SelectValue placeholder="Unassigned" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="NONE" className="font-bold italic text-slate-400">Not Specified</SelectItem>
                                                {employees.map(emp => (
                                                    <SelectItem key={emp.ID} value={emp.ID} className="font-bold">{emp.NAME}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-50">
                                <div className="flex justify-center sm:justify-start">
                                    {editingId && canManageSchedules && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="h-12 md:h-14 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all w-full sm:w-auto"
                                            onClick={() => handleDelete(editingId)}
                                        >
                                            Terminate Profile
                                        </Button>
                                    )}
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-12 md:h-14 px-10 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-500 w-full sm:w-auto"
                                        onClick={() => setIsFormOpen(false)}
                                    >
                                        Abort
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="h-12 md:h-14 px-10 md:px-14 bg-[#001489] hover:bg-blue-800 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-900/20 transition-all w-full sm:w-auto"
                                    >
                                        Commit Timeline
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Calendar Main Grid */}
            <div className="bg-white rounded-2xl md:rounded-[3rem] shadow-2xl shadow-blue-900/5 overflow-hidden ring-1 ring-slate-100">
                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-slate-100">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                        <div key={day} className={`py-3 md:py-6 text-center text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.5em] ${i === 0 ? "text-rose-500" : i === 6 ? "text-[#001489]" : "text-slate-400"}`}>
                            {day}
                        </div>
                    ))}
                </div>

                <div className="flex flex-col overflow-x-auto custom-scrollbar">
                    <div className="min-w-[500px] md:min-w-full flex flex-col">
                        {(() => {
                            const weeks = [];
                            let dayCount = 1;
                            const totalDays = days + startsAt;
                            const numWeeks = Math.ceil(totalDays / 7);

                            for (let w = 0; w < numWeeks; w++) {
                                const weekDays = [];
                                for (let d = 0; d < 7; d++) {
                                    const overallIndex = w * 7 + d;
                                    if (overallIndex < startsAt || dayCount > days) {
                                        weekDays.push(null);
                                    } else {
                                        weekDays.push(dayCount++);
                                    }
                                }

                                const weekStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), (w * 7) - startsAt + 1);
                                const weekEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), (w * 7) - startsAt + 7);

                                const weekSchedules = schedules.filter(s => {
                                    const sStart = new Date(s.STARTDATE);
                                    const sEnd = new Date(s.ENDDATE);
                                    return (sStart <= weekEndDate && sEnd >= weekStartDate);
                                }).map(s => {
                                    const sStart = new Date(s.STARTDATE);
                                    const sEnd = new Date(s.ENDDATE);
                                    const displayStart = sStart < weekStartDate ? 0 : Math.max(0, (sStart.getDate() - (w * 7 - startsAt + 1)));
                                    const displayEnd = sEnd > weekEndDate ? 6 : Math.min(6, (sEnd.getDate() - (w * 7 - startsAt + 1)));
                                    return { ...s, colStart: displayStart, colSpan: displayEnd - displayStart + 1 };
                                }).sort((a, b) => b.colSpan - a.colSpan);

                                const layers: any[][] = [];
                                weekSchedules.forEach(s => {
                                    let layerIdx = layers.findIndex(layer => !layer.some(ls => (s.colStart < ls.colStart + ls.colSpan && s.colStart + s.colSpan > ls.colStart)));
                                    if (layerIdx === -1) {
                                        layers.push([s]);
                                    } else {
                                        layers[layerIdx].push(s);
                                    }
                                });

                                weeks.push(
                                    <div key={w} className="relative min-h-[100px] md:min-h-[160px] border-b border-slate-100 last:border-0">
                                        <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                                            {Array.from({ length: 7 }).map((_, i) => (
                                                <div key={i} className="border-r border-slate-50 last:border-0" />
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-7 relative z-10 p-2 md:p-4">
                                            {weekDays.map((day, dIdx) => {
                                                if (!day) return <div key={dIdx} />;
                                                const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                                const isToday = new Date().toISOString().split('T')[0] === dateObj.toISOString().split('T')[0];
                                                return (
                                                    <div key={dIdx} className="flex justify-start">
                                                        <span className={`text-[9px] md:text-[11px] font-black ${isToday ? "bg-[#001489] text-white w-5 h-5 md:w-7 md:h-7 rounded-sm md:rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20" : dIdx === 0 ? "text-rose-400" : dIdx === 6 ? "text-blue-300" : "text-slate-300"}`}>
                                                            {day}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="relative z-10 px-0 pb-2 md:pb-4 space-y-0.5 md:space-y-1">
                                            {layers.map((layer, lIdx) => (
                                                <div key={lIdx} className="h-5 md:h-7 relative grid grid-cols-7 gap-0">
                                                    {layer.map(s => (
                                                        <div
                                                            key={s.SCHID}
                                                            className={`absolute h-full ${getScheduleColor(s.SCH_TYPE)} text-white px-1.5 md:px-3 flex items-center text-[7px] md:text-[9px] font-black uppercase tracking-tight shadow-sm cursor-pointer hover:brightness-110 transition-all z-20 
                                                                ${s.colStart === 0 && new Date(s.STARTDATE) < weekStartDate ? "rounded-l-none" : "rounded-sm md:rounded-l-lg"}
                                                                ${s.colStart + s.colSpan === 7 && new Date(s.ENDDATE) > weekEndDate ? "rounded-r-none" : "rounded-sm md:rounded-r-lg"}
                                                            `}
                                                            style={{
                                                                left: `${(s.colStart / 7) * 100}%`,
                                                                width: `${(s.colSpan / 7) * 100}%`,
                                                            }}
                                                            onClick={() => {
                                                                setEditingId(s.SCHID);
                                                                setFormData({
                                                                    startDate: new Date(s.STARTDATE).toISOString().split('T')[0],
                                                                    endDate: new Date(s.ENDDATE).toISOString().split('T')[0],
                                                                    schType: s.SCH_TYPE,
                                                                    division: s.DIVISION,
                                                                    memo: s.MEMO || "",
                                                                    emid1: s.EMID1?.trim() || "NONE",
                                                                    emid2: s.EMID2?.trim() || "NONE",
                                                                    emid3: s.EMID3?.trim() || "NONE",
                                                                    emid4: s.EMID4?.trim() || "NONE",
                                                                    emid5: s.EMID5?.trim() || "NONE"
                                                                });
                                                                setIsFormOpen(true);
                                                            }}
                                                        >
                                                            <span className="truncate">
                                                                [{s.SCH_TYPE}] {getEmployeeNames(s).split(',')[0]} / {s.MEMO}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            return weeks;
                        })()}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
}
