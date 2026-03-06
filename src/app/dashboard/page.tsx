"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, History, Activity, ExternalLink, Package, ShieldCheck, Zap, HardDrive, BarChart3, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState([
        { label: "Total Equipment", value: "---", icon: HardDrive, color: "text-[#001489]", bg: "bg-blue-50" },
        { label: "On-Going", value: "---", icon: FileText, color: "text-[#001489]", bg: "bg-blue-50" },
        { label: "Expirations", value: "---", icon: History, color: "text-amber-600", bg: "bg-amber-50" },
    ]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadDashboardData() {
            if (!session) return;

            try {
                const statsResponse = await fetch("/api/dashboard/stats");
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    setStats([
                        { label: "Total Equipment", value: statsData.totalEquipment?.toString() || "0", icon: HardDrive, color: "text-[#001489]", bg: "bg-blue-50" },
                        { label: "On-Going", value: statsData.ongoingCount?.toString() || "0", icon: FileText, color: "text-[#001489]", bg: "bg-blue-50" },
                        { label: "Expirations", value: statsData.upcomingExpirations?.toString() || "0", icon: History, color: "text-amber-600", bg: "bg-amber-50" },
                    ]);
                }
            } catch (error) {
                console.error("Dashboard Sync Error:", error);
            } finally {
                setIsLoading(false);
            }
        }

        loadDashboardData();
    }, [session]);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* HCTA NOTICE Section */}
            <Card className="bg-[#001489] text-white border-none rounded-[2rem] overflow-hidden shadow-xl shadow-blue-900/20">
                <CardContent className="p-8 flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <Zap className="w-6 h-6 text-blue-200" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-blue-200 mb-1">HCTA NOTICE</h3>
                            <p className="text-xl font-bold tracking-tight">System maintenance scheduled for March 15th at 22:00 PST. Please plan accordingly.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-l-4 border-[#001489] pl-8">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none mb-2">
                        {/* @ts-ignore */}
                        {session?.user?.corpName || "Asset"} <span className="text-[#001489]">Control Center</span>
                    </h2>
                    <div className="flex items-center space-x-4">
                        <p className="text-xs font-bold text-slate-400">
                            Authorized: <span className="text-[#001489] uppercase font-black">{session?.user?.name}</span>
                        </p>
                    </div>
                </div>
                <div className="hidden xl:flex items-center space-x-3 text-slate-300">
                    <Zap className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em]">Integrated Telemetry</span>
                </div>
            </div>

            {/* Metric Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {stats.map((stat) => (
                    <Card
                        key={stat.label}
                        className="bg-white border-slate-100 hover:border-[#001489]/20 hover:shadow-xl hover:shadow-[#001489]/5 transition-all duration-300 rounded-[2rem] group relative overflow-hidden cursor-pointer"
                        onClick={() => {
                            if (stat.label === "Total Equipment") router.push("/dashboard/equipment");
                            if (stat.label === "On-Going") router.push("/dashboard/equipment?filter=onGoingOnly");
                            if (stat.label === "Expirations") router.push("/dashboard/equipment?filter=expirationOnly");
                        }}
                    >
                        <CardContent className="p-6">
                            <div className="flex flex-col space-y-3">
                                <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center border border-transparent group-hover:bg-white group-hover:border-slate-100 transition-all shadow-sm`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                                    <p className="text-4xl font-black tracking-tighter text-slate-900">{stat.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Interface Flow */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Sub Panel: Integrity (Manager only) */}
                {/* @ts-ignore */}
                {session?.user?.role === "MANAGER" && (
                    <Card className="xl:col-span-2 bg-white border-slate-100 rounded-[2.5rem] overflow-hidden relative group shadow-sm flex flex-col justify-between">
                        <CardHeader className="p-10 pb-4 relative z-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <ShieldCheck className="w-5 h-5 text-[#001489]" />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Handshake Monitor</span>
                            </div>
                            <h3 className="text-3xl font-black tracking-tighter leading-tight text-slate-900 uppercase">
                                Secure Protocol <span className="text-[#001489]">Active</span>
                            </h3>
                        </CardHeader>

                        <CardContent className="p-10 space-y-10 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div className="space-y-4 md:col-span-1">
                                    <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-widest text-[#001489]">
                                        <span className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>Channel Stable</span>
                                        </span>
                                        <span>100%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div className="h-full w-full bg-[#001489]" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Ciphers</p>
                                        <p className="text-[11px] font-black text-slate-900 font-mono">AES-256-GCM</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Region</p>
                                        <p className="text-[11px] font-black text-slate-900 font-mono">US-WEST_01</p>
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full max-w-xs h-14 bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-slate-900/10">
                                Validate Signature
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
