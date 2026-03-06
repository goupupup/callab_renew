"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, Search, Mail, UserPlus, Download, Bell, Cpu, Shield, Globe, Activity, HelpCircle, FileText, PhoneCall, ClipboardCheck, ArrowUpRight } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await signIn("credentials", {
                redirect: false,
                username: formData.username,
                password: formData.password,
            });

            if (result?.error) {
                toast.error("Authentication Failed", {
                    description: "Invalid credentials. Please verify your identity.",
                });
            } else {
                toast.success("Authentication Successful", {
                    description: "Handshake stable. Redirecting...",
                });
                router.push("/dashboard");
                router.refresh();
            }
        } catch (error) {
            toast.error("System Error", {
                description: "Terminal connection lost. Try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-stretch">

            {/* Left Panel: Information & Branding (Reflex Blue Accent) */}
            <div className="hidden lg:flex lg:w-3/5 bg-[#001489] relative overflow-hidden flex-col justify-between p-20">
                {/* Decorative Elements */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white opacity-[0.03] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute inset-0 opacity-[0.1] bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
                </div>

                <div className="relative z-10 animate-in fade-in slide-in-from-left-10 duration-1000">
                    <Image
                        src="/HCT_logo.png"
                        alt="HCT Logo"
                        width={280}
                        height={92}
                        className="object-contain brightness-0 invert"
                        priority
                    />
                    <div className="mt-24 space-y-8">
                        <h1 className="text-7xl font-black text-white tracking-tighter leading-[0.9]">
                            INTEGRATED <br />
                            <span className="text-blue-300">COMPLIANCE</span> <br />
                            PORTAL
                        </h1>
                        <p className="text-xl text-blue-100/60 max-w-lg font-medium leading-relaxed">
                            Global standard precision asset management. <br />
                            <span className="text-white">Empowering 17,000+ organizations since 2004.</span>
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex flex-wrap gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
                    {[
                        { icon: Shield, text: "ISO/IEC 17025 VERIFIED" },
                        { icon: Globe, text: "GLOBAL NETWORK ACCESS" },
                        { icon: Activity, text: "REAL-TIME MONITORING" }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center space-x-3 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                            <item.icon className="w-5 h-5 text-blue-300" />
                            <span className="text-xs font-black uppercase tracking-widest text-white/80">{item.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Login Terminal (Clean White) */}
            <div className="w-full lg:w-2/5 bg-white flex flex-col justify-center p-8 md:p-16 lg:p-24 shadow-[-50px_0_100px_rgba(0,0,0,0.03)] relative z-20">

                <div className="w-full max-w-md mx-auto space-y-12 animate-in fade-in slide-in-from-right-10 duration-1000">

                    <div className="lg:hidden mb-12 flex justify-center">
                        <Image
                            src="/HCT_logo.png"
                            alt="HCT Logo"
                            width={220}
                            height={72}
                            className="object-contain"
                            priority
                        />
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-4xl font-black tracking-tight text-[#001489]">System Access</h2>
                        <p className="text-sm font-semibold text-slate-400">Please authenticate to access the portal.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Identity</Label>
                                <Input
                                    id="username"
                                    placeholder="yourid@company.com"
                                    required
                                    className="h-14 bg-slate-50 border-slate-200 focus:border-[#001489] focus:ring-1 focus:ring-[#001489]/20 rounded-xl text-md font-bold px-6 transition-all"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <Label htmlFor="password" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Pass Key</Label>
                                    <button type="button" className="text-[11px] font-black text-[#001489] hover:underline uppercase tracking-widest">forgot?</button>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    className="h-14 bg-slate-50 border-slate-200 focus:border-[#001489] focus:ring-1 focus:ring-[#001489]/20 rounded-xl text-md font-bold px-6 transition-all"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-16 bg-[#001489] hover:bg-[#000e62] text-white font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 shadow-xl shadow-blue-900/10 active:scale-[0.98]"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center space-x-3">
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>Authorizing...</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-4">
                                    <LogIn className="w-6 h-6" />
                                    <span>LOGIN TERMINAL</span>
                                </div>
                            )}
                        </Button>
                    </form>

                    <div className="grid grid-cols-2 gap-4">
                        <button className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-all group">
                            <div className="flex flex-col items-start">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">New User</span>
                                <span className="text-sm font-bold text-slate-700">Apply Access</span>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-[#001489] transition-colors" />
                        </button>
                        <button className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-all group">
                            <div className="flex flex-col items-start">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inquiry</span>
                                <span className="text-sm font-bold text-slate-700">System Support</span>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-[#001489] transition-colors" />
                        </button>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-300">
                        <span>HCT AMERICA INC.</span>
                        <div className="flex space-x-4">
                            <span className="flex items-center"><Shield className="w-3 h-3 mr-1.5" /> FIPS 140-2</span>
                            <span className="flex items-center"><Globe className="w-3 h-3 mr-1.5" /> NODE-01</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
