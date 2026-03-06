"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import {
    LayoutDashboard,
    Settings,
    FileText,
    LogOut,
    Bell,
    Search,
    ChevronRight,
    Activity,
    Box,
    Shield,
    Menu,
    User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import Image from "next/image";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/login");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-12 h-12 border-4 border-[#001489]/10 border-t-[#001489] rounded-full animate-spin" />
            </div>
        );
    }

    const navItems = [
        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
        { icon: Settings, label: "Equipment", href: "/dashboard/equipment" },
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans text-slate-900">

            {/* Sidebar (Clean & High Contrast) */}
            <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col relative z-20 shadow-sm">
                <div
                    className="h-24 px-8 flex items-center justify-center border-b border-slate-100/10 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => router.push("/dashboard")}
                >
                    <Image
                        src="/HCT_logo.png"
                        alt="HCT Logo"
                        width={180}
                        height={60}
                        className="object-contain"
                        priority
                    />
                </div>

                <div className="flex-1 p-6 space-y-10 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <p className="px-5 text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Navigation</p>
                        <nav className="space-y-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <button
                                        key={item.label}
                                        onClick={() => router.push(item.href)}
                                        className={`w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all duration-200 group ${isActive
                                            ? "bg-[#001489] text-white shadow-lg shadow-[#001489]/10"
                                            : "text-slate-500 hover:text-[#001489] hover:bg-slate-50"
                                            }`}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <item.icon className={`w-4.5 h-4.5 transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-[#001489]"}`} />
                                            <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                                        </div>
                                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/50" />}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="space-y-6 px-5 border-t border-slate-50 pt-8">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">System Metrics</p>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-slate-400 uppercase tracking-widest">Efficiency</span>
                                <span className="text-[#001489]">99.9%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full w-[99.9%] bg-[#001489]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Section */}
                <div className="p-6 border-t border-slate-100 bg-white">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-[#001489] font-black text-sm border border-slate-200 shadow-sm">
                            {session?.user?.name?.[0] || "U"}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                                {session?.user?.name || "User"}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] truncate">
                                {/* @ts-ignore */}
                                {session?.user?.corpName || "Asset Manager"}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg h-12 border border-slate-100"
                        onClick={() => signOut()}
                    >
                        <LogOut className="w-4 h-4 mr-3" />
                        <span className="font-black uppercase tracking-[0.2em] text-[10px]">Logout</span>
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden">
                {/* Header */}
                <header className="h-24 px-10 flex items-center justify-between bg-white border-b border-slate-200">
                    <div className="flex items-center space-x-8 flex-1 max-w-xl">
                        <div className="relative w-full group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-[#001489] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search certificates or assets..."
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl h-14 pl-14 pr-6 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#001489] transition-all outline-none placeholder:text-slate-400 shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2 border-r border-slate-100 pr-6">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-[#001489] hover:bg-slate-50 rounded-xl w-12 h-12">
                                <Bell className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-[#001489] hover:bg-slate-50 rounded-xl w-12 h-12">
                                <Activity className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="hidden lg:block text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Status</p>
                            <div className="flex items-center justify-end space-x-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[12px] font-black text-[#001489] uppercase tracking-widest leading-none">
                                    {/* @ts-ignore */}
                                    {session?.user?.corpName || "System"} Online
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Viewport */}
                <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </main>

            <Toaster position="top-right" />

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
}
