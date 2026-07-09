"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, Shield, Globe, Activity, ArrowUpRight, Award, Download, Users, Phone, ClipboardList } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isMembershipOpen, setIsMembershipOpen] = useState(false);
    const [isRequestOpen, setIsRequestOpen] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });
    const [requestData, setRequestData] = useState({
        email: "",
        password: "",
        userName: "",
        contactEmail: "",
        phone: "",
        companyName: "",
        companyLocation: "",
    });

    const serviceActions = [
        {
            label: "Our Calibration Services",
            icon: Award,
            action: () => window.open("/HCTA_Calibration_service_Brochure.pdf", "_blank", "noopener,noreferrer"),
        },
        {
            label: "Certification Download",
            icon: Download,
            action: () => window.open("/HCTA_CMC_2026-2.pdf", "_blank", "noopener,noreferrer"),
        },
        {
            label: "Membership Procedure",
            icon: Users,
            action: () => setIsMembershipOpen(true),
        },
        {
            label: "Contact Us",
            icon: Phone,
            action: () => window.open("https://hctcalibration.com/contact/", "_blank", "noopener,noreferrer"),
        },
        {
            label: "Request Quote",
            icon: ClipboardList,
            action: () => toast.info("Request Quote is being prepared."),
        },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const ok = await login(formData.username, formData.password);
            if (!ok) {
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

    const handleAccessRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingRequest(true);
        const loadingToast = toast.loading("Submitting access request...");

        try {
            const response = await apiFetch("/api/account-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.detail || "Access request failed.");
            }
            toast.success("Access request submitted", {
                description: "An administrator will verify your company and activate your account.",
                id: loadingToast,
            });
            setIsRequestOpen(false);
            setRequestData({
                email: "",
                password: "",
                userName: "",
                contactEmail: "",
                phone: "",
                companyName: "",
                companyLocation: "",
            });
        } catch (error) {
            toast.error("Access request failed", {
                description: error instanceof Error ? error.message : "Please check the request information.",
                id: loadingToast,
            });
        } finally {
            setIsSubmittingRequest(false);
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

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Service Resources</p>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Public Access</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {serviceActions.map((item) => (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={item.action}
                                    className="flex min-h-12 items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 text-left transition-all hover:border-[#001489]/25 hover:bg-slate-50 group"
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-[#001489]">
                                            <item.icon className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="truncate text-[11px] font-black uppercase tracking-wide text-slate-600">{item.label}</span>
                                    </span>
                                    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[#001489]" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <button
                            type="button"
                            onClick={() => setIsRequestOpen(true)}
                            className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-all group"
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">New User</span>
                                <span className="text-sm font-bold text-slate-700">Apply Access</span>
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

            <Dialog open={isMembershipOpen} onOpenChange={setIsMembershipOpen}>
                <DialogContent className="max-w-2xl border-none bg-white p-0 shadow-2xl rounded-2xl overflow-hidden">
                    <DialogHeader className="border-b border-slate-100 bg-slate-50/60 p-6">
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Membership Procedure</DialogTitle>
                        <DialogDescription className="text-sm font-semibold text-slate-500">
                            HAS membership approval process
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-6">
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
                                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Additional Inquiries</p>
                                <p>Phone 510-933-8848</p>
                                <p>Email calsales@hctamerica.com</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
                <DialogContent className="max-w-2xl border-none bg-white p-0 shadow-2xl rounded-2xl overflow-hidden">
                    <DialogHeader className="border-b border-slate-100 bg-slate-50/60 p-6">
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">Apply Access</DialogTitle>
                        <DialogDescription className="text-sm font-semibold text-slate-500">
                            Submit your account request. An administrator will match your company before activation.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAccessRequest} className="grid max-h-[75vh] grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
                        <RequestField label="Login Email" type="email" value={requestData.email} onChange={(value) => setRequestData({ ...requestData, email: value })} required />
                        <RequestField label="Password" type="password" value={requestData.password} onChange={(value) => setRequestData({ ...requestData, password: value })} required />
                        <RequestField label="Name" value={requestData.userName} onChange={(value) => setRequestData({ ...requestData, userName: value })} required />
                        <RequestField label="Contact Email" type="email" value={requestData.contactEmail} onChange={(value) => setRequestData({ ...requestData, contactEmail: value })} required />
                        <RequestField label="Phone (Optional)" value={requestData.phone} onChange={(value) => setRequestData({ ...requestData, phone: value })} />
                        <RequestField label="Company Name" value={requestData.companyName} onChange={(value) => setRequestData({ ...requestData, companyName: value })} required />
                        <div className="space-y-2 sm:col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Company Location</Label>
                            <textarea
                                required
                                className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-[#001489] focus:bg-white focus:ring-1 focus:ring-[#001489]/20"
                                value={requestData.companyLocation}
                                onChange={(event) => setRequestData({ ...requestData, companyLocation: event.target.value })}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Button
                                type="submit"
                                className="h-12 w-full rounded-xl bg-[#001489] text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-[#000e62]"
                                disabled={isSubmittingRequest}
                            >
                                {isSubmittingRequest ? "Submitting..." : "Submit Access Request"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function RequestField({
    label,
    value,
    onChange,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</Label>
            <Input
                type={type}
                required={required}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 focus:border-[#001489] focus:bg-white focus:ring-1 focus:ring-[#001489]/20"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}
