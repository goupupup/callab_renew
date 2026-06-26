"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, History, BarChart3, HardDrive, Zap, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-client";

export default function DashboardPage() {
    const { data: session } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<any>({
        totalEquipment: "---",
        ongoingCount: "---",
        upcomingExpirations: "---",
        companyStats: null
    });
    const [isLoading, setIsLoading] = useState(true);

    const isMaster = (session?.user as any)?.role === "MASTER";

    useEffect(() => {
        async function loadDashboardData() {
            if (!session) return;

            try {
                const statsResponse = await apiFetch("/api/dashboard/stats");
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    setStats(statsData);
                }
            } catch (error) {
                console.error("Dashboard Sync Error:", error);
            } finally {
                setIsLoading(false);
            }
        }

        loadDashboardData();
    }, [session]);

    const metricCards = [
        { label: "Total Equipment", value: stats.totalEquipment?.toString() || "0", icon: HardDrive, color: "text-[#001489]", bg: "bg-blue-50", link: "/dashboard/equipment" },
        { label: "On-Going", value: stats.ongoingCount?.toString() || "0", icon: FileText, color: "text-[#001489]", bg: "bg-blue-50", link: "/dashboard/equipment?filter=onGoingOnly" },
        { label: "Expirations", value: stats.upcomingExpirations?.toString() || "0", icon: History, color: "text-amber-600", bg: "bg-amber-50", link: "/dashboard/equipment?filter=expirationOnly" },
    ];

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* HCTA NOTICE Section */}
            <Card className="bg-[#001489] text-white border-none rounded-2xl md:rounded-[2rem] overflow-hidden shadow-xl shadow-blue-900/20">
                <CardContent className="p-5 md:p-8 flex items-center justify-between">
                    <div className="flex items-center space-x-4 md:space-x-6">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center backdrop-blur-md shrink-0">
                            <Zap className="w-5 h-5 md:w-6 md:h-6 text-blue-200" />
                        </div>
                        <div>
                            <h3 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-blue-200 mb-1">HCTA NOTICE</h3>
                            <p className="text-sm md:text-xl font-bold tracking-tight line-clamp-2 md:line-clamp-none">System maintenance scheduled for March 15th at 22:00 PST.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-l-4 border-[#001489] pl-4 md:pl-8">
                <div>
                    <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 leading-tight mb-2">
                        {/* @ts-ignore */}
                        {session?.user?.corpName || "Asset"} <span className="text-[#001489]">Control Center</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 md:gap-4">
                        <p className="text-[10px] md:text-xs font-bold text-slate-400">
                            Authorized: <span className="text-[#001489] uppercase font-black">{session?.user?.name}</span>
                        </p>
                        <Badge variant="outline" className="text-[8px] md:text-[9px] font-black uppercase tracking-widest border-slate-200 text-slate-400 px-2 md:px-3 py-0.5 md:py-1">
                            {/* @ts-ignore */}
                            {session?.user?.role || "USER"}
                        </Badge>
                    </div>
                </div>
                <div className="hidden xl:flex items-center space-x-3 text-slate-300">
                    <Zap className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em]">Integrated Telemetry</span>
                </div>
            </div>

            {/* Metric Blocks (Own Company) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {metricCards.map((stat) => (
                    <Card
                        key={stat.label}
                        className="bg-white border-slate-100 hover:border-[#001489]/20 hover:shadow-xl hover:shadow-[#001489]/5 transition-all duration-300 rounded-2xl md:rounded-[2rem] group relative overflow-hidden cursor-pointer"
                        onClick={() => router.push(stat.link)}
                    >
                        <CardContent className="p-4 md:p-6">
                            <div className="flex flex-col space-y-2 md:space-y-3">
                                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center border border-transparent group-hover:bg-white group-hover:border-slate-100 transition-all shadow-sm`}>
                                    <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-slate-400">{stat.label}</p>
                                    <p className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900">{stat.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Company Overview Blocks (MASTER ONLY) */}
            {isMaster && stats.companyStats && (
                <div className="space-y-6 md:space-y-8 mt-10 md:mt-16 pt-10 md:pt-16 border-t border-slate-100">
                    <div className="flex items-center space-x-3">
                        <BarChart3 className="w-5 h-5 text-[#001489]" />
                        <h3 className="text-lg md:text-xl font-black tracking-[0.1em] md:tracking-[0.2em] text-slate-900 uppercase">Company Overview</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
                        {stats.companyStats.map((company: any) => (
                            <Card
                                key={company.CORP_ID}
                                className="bg-white border-slate-100 hover:border-[#001489]/30 transition-all rounded-xl md:rounded-[1.5rem] shadow-sm overflow-hidden group h-full flex flex-col"
                                onClick={() => router.push(`/dashboard/equipment?company=${company.CORP_ID}`)}
                            >
                                <div className="p-4 md:p-5 pb-2 bg-slate-50/5 group-hover:bg-[#001489]/5 transition-colors border-b border-transparent group-hover:border-slate-100 flex-none">
                                    <h4 className="text-[10px] md:text-[11px] font-black text-slate-900 truncate uppercase tracking-wider">
                                        {company.CORP_NAME || "Untitled Corp"}
                                    </h4>
                                    <p className="text-[8px] font-bold text-slate-400">ID: {company.CORP_ID}</p>
                                </div>
                                <CardContent className="p-4 md:p-5 flex-1 flex flex-col justify-center">
                                    <div className="flex items-center justify-between gap-1 md:gap-2">
                                        <div className="text-center flex-1">
                                            <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Total</p>
                                            <p className="text-sm md:text-lg font-black text-slate-900">{company.TOTAL}</p>
                                        </div>
                                        <div className="w-[1px] h-6 md:h-8 bg-slate-100" />
                                        <div className="text-center flex-1">
                                            <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">On-Going</p>
                                            <p className="text-sm md:text-lg font-black text-[#001489]">{company.ONGOING}</p>
                                        </div>
                                        <div className="w-[1px] h-6 md:h-8 bg-slate-100" />
                                        <div className="text-center flex-1">
                                            <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Expired</p>
                                            <p className="text-sm md:text-lg font-black text-rose-600">{company.EXPIRED}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Security Monitor Interface */}
            <div className="grid grid-cols-1 gap-8">
                <Card className="bg-white border-slate-100 rounded-2xl md:rounded-[2.5rem] overflow-hidden relative group shadow-sm flex flex-col justify-between">
                    <CardHeader className="p-6 md:p-10 pb-4 relative z-10">
                        <div className="flex items-center space-x-3 mb-4 md:mb-6">
                            <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-[#001489]" />
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-slate-400">Security Monitor</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black tracking-tighter leading-tight text-slate-900 uppercase">
                            Protected Session <span className="text-[#001489]">Level 01</span>
                        </h3>
                    </CardHeader>
                    <CardContent className="p-6 md:p-10 pt-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 border-t border-slate-50 pt-6">
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">Live Connection</span>
                            </div>
                            <div className="text-[9px] md:text-[10px] font-mono text-slate-400">
                                AES-256-GCM / {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
