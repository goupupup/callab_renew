"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Award, BarChart3, ClipboardList, Download, ExternalLink, FileText, HardDrive, History, Phone, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CompanyStat = {
    corpId: string;
    corpName: string;
    total: number;
    ongoing: number;
    expired: number;
};

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
    const [isMembershipOpen, setIsMembershipOpen] = useState(false);

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

    const serviceActions = [
        {
            label: "Our Calibration Services",
            description: "Review HCT America's calibration service scope.",
            icon: Award,
            action: () => window.open("/calibration-services.pdf", "_blank", "noopener,noreferrer"),
        },
        {
            label: "Certification Download",
            description: "Open the certificate download guide.",
            icon: Download,
            action: () => window.open("/certification-download.pdf", "_blank", "noopener,noreferrer"),
        },
        {
            label: "Membership Procedure",
            description: "Check the membership approval process.",
            icon: Users,
            action: () => setIsMembershipOpen(true),
        },
        {
            label: "Contact Us",
            description: "Go to the HCT Calibration contact page.",
            icon: Phone,
            action: () => window.open("https://hctcalibration.com/contact/", "_blank", "noopener,noreferrer"),
        },
        {
            label: "Request Quote",
            description: "Quote request workflow is being prepared.",
            icon: ClipboardList,
            action: () => router.push("/dashboard/request-quote"),
        },
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
                        {stats.companyStats.map((company: CompanyStat) => (
                            <Card
                                key={company.corpId}
                                className="bg-white border-slate-100 hover:border-[#001489]/30 transition-all rounded-xl md:rounded-[1.5rem] shadow-sm overflow-hidden group h-full flex flex-col"
                                onClick={() => router.push(`/dashboard/equipment?company=${encodeURIComponent(company.corpId)}`)}
                            >
                                <div className="p-4 md:p-5 pb-2 bg-slate-50/5 group-hover:bg-[#001489]/5 transition-colors border-b border-transparent group-hover:border-slate-100 flex-none">
                                    <h4 className="text-[10px] md:text-[11px] font-black text-slate-900 truncate uppercase tracking-wider">
                                        {company.corpName || "Untitled Corp"}
                                    </h4>
                                    <p className="text-[8px] font-bold text-slate-400">ID: {company.corpId}</p>
                                </div>
                                <CardContent className="p-4 md:p-5 flex-1 flex flex-col justify-center">
                                    <div className="flex items-center justify-between gap-1 md:gap-2">
                                        <div className="text-center flex-1">
                                            <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Total</p>
                                            <p className="text-sm md:text-lg font-black text-slate-900">{company.total}</p>
                                        </div>
                                        <div className="w-[1px] h-6 md:h-8 bg-slate-100" />
                                        <div className="text-center flex-1">
                                            <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">On-Going</p>
                                            <p className="text-sm md:text-lg font-black text-[#001489]">{company.ongoing}</p>
                                        </div>
                                        <div className="w-[1px] h-6 md:h-8 bg-slate-100" />
                                        <div className="text-center flex-1">
                                            <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Expired</p>
                                            <p className="text-sm md:text-lg font-black text-rose-600">{company.expired}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Service Actions */}
            <section className="space-y-5 md:space-y-6">
                <div className="flex flex-col gap-2 border-l-4 border-[#001489] pl-4 md:pl-6">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">HCT America Support</p>
                    <h3 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">Service Resources</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4">
                    {serviceActions.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            onClick={item.action}
                            className="min-h-[150px] rounded-xl border border-slate-100 bg-white p-4 md:p-5 text-left shadow-sm transition-all hover:border-[#001489]/30 hover:shadow-lg hover:shadow-[#001489]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001489]/30"
                        >
                            <div className="flex h-full flex-col justify-between gap-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-[#001489]">
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-900 leading-snug">{item.label}</p>
                                    <p className="text-[10px] font-semibold leading-relaxed text-slate-400">{item.description}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            <Dialog open={isMembershipOpen} onOpenChange={setIsMembershipOpen}>
                <DialogContent className="max-w-2xl border-none bg-white p-0 shadow-2xl rounded-2xl md:rounded-[2rem] overflow-hidden">
                    <DialogHeader className="border-b border-slate-100 bg-slate-50/60 p-6 md:p-8">
                        <DialogTitle className="text-lg md:text-2xl font-black tracking-tight text-slate-900">Membership Procedure</DialogTitle>
                        <DialogDescription className="text-xs md:text-sm font-semibold text-slate-500">
                            HAS membership approval process
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-6 md:p-8">
                        <ol className="space-y-4 text-sm font-semibold leading-relaxed text-slate-600">
                            <li>1. Membership registration is available only to customers or companies with an existing transaction history with HCT America.</li>
                            <li>2. Click "Sign Up" and enter the required information to register as a temporary member.</li>
                            <li>3. Enter your business registration number accurately so we can verify your customer status.</li>
                            <li>4. Once your customer status is confirmed, full membership will be granted. An approval notice will be sent to the registered email address within 7 days of the application.</li>
                            <li>5. Only approved users can log in and use HAS normally.</li>
                        </ol>
                        <div className="mt-6 border-t border-slate-100 pt-6 space-y-4 text-sm font-semibold leading-relaxed text-slate-600">
                            <p>The full membership approval process is required to maintain authorized access and security for third-party equipment.</p>
                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Additional Inquiries</p>
                                <p>Phone 510-933-8848</p>
                                <p>Email calsales@hctamerica.com</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
