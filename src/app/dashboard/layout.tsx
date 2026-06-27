"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
    LayoutDashboard,
    Settings,
    UserCog,
    FileText,
    LogOut,
    Bell,
    ChevronRight,
    Activity,
    Menu,
    X,
    User,
    ShieldCheck,
    Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import Image from "next/image";
import { useAuth } from "@/lib/auth-client";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    
    // Hooks MUST be at the top level
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/login");
        }
    }, [status, router]);

    // Close sidebar on navigation (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-12 h-12 border-4 border-[#001489]/10 border-t-[#001489] rounded-full animate-spin" />
            </div>
        );
    }

    const role = (session?.user as any)?.role;
    const isMaster = role === "MASTER";
    const isEmployee = role === "EMPLOYEE";
    const isElevated = isMaster || isEmployee;

    const commonNavItems = [
        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
        { icon: Settings, label: "Equipments", href: "/dashboard/equipment" },
        { icon: UserCog, label: "Account", href: "/dashboard/account" },
    ];

    const adminNavItems: any[] = [];
    if (isElevated) {
        adminNavItems.push({
            icon: Search, label: "Search", href: "/dashboard/search",
            subItems: [
                { label: "REG NO", tab: "regNo", href: "/dashboard/search/reg-no" },
                { label: "CAL NO", tab: "calNo", href: "/dashboard/search/cal-no" },
                { label: "MODEL", tab: "model", href: "/dashboard/search/model" },
                { label: "ON-GOING", tab: "ongoing", href: "/dashboard/search/ongoing" },
                { label: "EXPIRATIONS", tab: "expirations", href: "/dashboard/search/expirations" },
            ],
        });
        adminNavItems.push({ icon: FileText, label: "Schedule", href: "/dashboard/schedule" });
    }
    if (isMaster) {
        adminNavItems.push({ icon: User, label: "Accounts", href: "/dashboard/accounts" });
    }

    const renderNavItems = (items: any[]) => (
        <nav className="space-y-1">
            {items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = expandedItem === item.label;

                return (
                    <div
                        key={item.label}
                        className="relative"
                    >
                        <button
                            onClick={(e) => {
                                if (hasSubItems) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setFlyoutPos({ top: rect.top, left: rect.right + 8 });
                                    setExpandedItem(isExpanded ? null : item.label);
                                } else {
                                    router.push(item.href);
                                    setExpandedItem(null);
                                }
                            }}
                            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl transition-all duration-200 group ${isActive
                                ? "bg-[#001489] text-white shadow-lg shadow-[#001489]/10"
                                : "text-slate-500 hover:text-[#001489] hover:bg-slate-50"
                                }`}
                        >
                            <div className="flex items-center space-x-4">
                                <item.icon className={`w-4 h-4 transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-[#001489]"}`} />
                                <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                            </div>
                            {isActive && !hasSubItems && <ChevronRight className="w-3 h-3 text-white/50" />}
                            {hasSubItems && <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""} ${isActive ? "text-white/50" : "text-slate-300"}`} />}
                        </button>

                        {/* Flyout Submenu (Triggered by CLICK) */}
                        {hasSubItems && isExpanded && (
                            <>
                                {/* Backdrop to close on click outside */}
                                <div className="fixed inset-0 z-[9998]" onClick={() => setExpandedItem(null)} />
                                <div
                                    className="fixed z-[9999] animate-in slide-in-from-left-2 fade-in duration-200"
                                    style={{ top: flyoutPos.top, left: flyoutPos.left }}
                                >
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-[160px]">
                                        <p className="px-4 py-2 text-[8px] font-black uppercase tracking-[0.3em] text-slate-300">Search by</p>
                                        {item.subItems.map((sub: any) => (
                                            <button
                                                key={sub.tab}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(sub.href);
                                                    setExpandedItem(null);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-2.5 ${pathname === sub.href
                                                    ? "bg-[#001489]/5 text-[#001489]"
                                                    : "text-slate-600 hover:bg-[#001489]/5 hover:text-[#001489]"
                                                    }`}
                                            >
                                                <span className={`w-1 h-1 rounded-full ${pathname === sub.href ? "bg-[#001489]" : "bg-slate-300"}`} />
                                                {sub.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </nav>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans text-slate-900">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                <div
                    className="h-24 px-8 flex items-center justify-center border-b border-slate-100 cursor-pointer"
                    onClick={() => router.push("/dashboard")}
                >
                    <Image
                        src="/HCT_logo.png"
                        alt="HCT Logo"
                        width={140}
                        height={40}
                        className="object-contain"
                        priority
                    />
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }}>
                        <X className="w-6 h-6 text-slate-400" />
                    </Button>
                </div>

                <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
                    {/* Common Section */}
                    <div className="space-y-3">
                        <p className="px-5 text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Functions</p>
                        {renderNavItems(commonNavItems)}
                    </div>

                    {/* Admin Section (Separated) */}
                    {adminNavItems.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-slate-50">
                            <div className="flex items-center px-5 space-x-2">
                                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Administration</p>
                            </div>
                            {renderNavItems(adminNavItems)}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.5em] text-center">
                        © 2026 HCT AMERICA INC.
                    </p>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden h-screen md:h-auto">
                {/* Header */}
                <header className="h-20 md:h-24 px-4 md:px-10 flex items-center justify-between bg-white border-b border-slate-200 shrink-0">
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="md:hidden text-slate-400 mr-2" onClick={() => setIsSidebarOpen(true)}>
                            <Menu className="w-6 h-6" />
                        </Button>
                        <div className="hidden md:block">
                            <h1 className="text-sm font-black uppercase tracking-widest text-[#001489]">
                                Operation <span className="text-slate-400">Hub</span>
                            </h1>
                        </div>
                    </div>

                    {/* Right Section: Redesigned Profile (As per reference) */}
                    <div className="flex items-center space-x-4 md:space-x-8">
                        {/* Status Icons */}
                        <div className="hidden sm:flex items-center space-x-1 border-r border-slate-100 pr-4 md:pr-8">
                            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-[#001489] w-10 h-10">
                                <Bell className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-[#001489] w-10 h-10">
                                <Activity className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* User Profile Info & Logout */}
                        <div className="flex items-center space-x-4 md:space-x-6">
                            <div className="flex items-center space-x-3 md:space-x-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#001489]/5 rounded-2xl flex items-center justify-center border border-[#001489]/10 shadow-sm overflow-hidden">
                                    <span className="font-black text-[#001489] text-base md:text-lg">
                                        {session?.user?.name?.[0] || (role === "MASTER" ? "M" : "U")}
                                    </span>
                                </div>
                                <div className="hidden xs:flex flex-col">
                                    <p className="text-xs md:text-sm font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">
                                        {(isMaster ? "MANAGER" : isEmployee ? "STAFF" : "CLIENT")}
                                    </p>
                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                        {(session?.user as any)?.corpName || "HCT AMERICA. INC"}
                                    </p>
                                </div>
                            </div>

                            {/* Refined Logout Button */}
                            <button
                                onClick={() => logout()}
                                className="group h-10 md:h-12 pl-4 md:pl-5 pr-5 md:pr-6 rounded-2xl border border-slate-100 bg-white hover:bg-rose-50 hover:border-rose-100 transition-all flex items-center space-x-3 shadow-sm active:scale-95"
                            >
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-950 flex items-center justify-center text-white transition-colors group-hover:bg-rose-600">
                                    <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </div>
                                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-rose-600 transition-colors">Logout</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Dashboard Viewport */}
                <div className="px-6 md:px-12 py-8 md:py-10 flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
                    {children}
                </div>
            </main>

            <Toaster position="top-right" />

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                
                @media (max-width: 400px) {
                    .xs\\:flex { display: flex; }
                    .xs\\:hidden { display: none; }
                }
            `}</style>
        </div>
    );
}
