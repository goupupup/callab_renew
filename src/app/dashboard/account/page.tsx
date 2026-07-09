"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AtSign, Building2, IdCard, KeyRound, Phone, Save, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMessageDialog } from "@/components/ui/message-dialog";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-client";

type AccountForm = {
    userId: string;
    userName: string;
    corpId: string;
    corpName: string;
    telNo: string;
    email: string;
    currentPassword: string;
    password: string;
    confirmPassword: string;
};

const emptyForm: AccountForm = {
    userId: "",
    userName: "",
    corpId: "",
    corpName: "",
    telNo: "",
    email: "",
    currentPassword: "",
    password: "",
    confirmPassword: "",
};

function emptyIfNullish(value: unknown): string {
    if (value === null || value === undefined) return "";
    const text = String(value).trim();
    return text.toLowerCase() === "null" ? "" : text;
}

export default function AccountPage() {
    const { refresh } = useAuth();
    const { confirm, MessageDialog } = useMessageDialog();
    const [form, setForm] = useState<AccountForm>(emptyForm);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function loadAccount() {
            setIsLoading(true);
            try {
                const response = await apiFetch("/api/account");
                if (!response.ok) {
                    toast.error("Failed to load account information.");
                    return;
                }
                const account = await response.json();
                setForm({
                    userId: emptyIfNullish(account.userId),
                    userName: emptyIfNullish(account.userName),
                    corpId: emptyIfNullish(account.corpId),
                    corpName: emptyIfNullish(account.corpName),
                    telNo: emptyIfNullish(account.telNo),
                    email: emptyIfNullish(account.email),
                    currentPassword: "",
                    password: "",
                    confirmPassword: "",
                });
            } catch {
                toast.error("Network synchronization error.");
            } finally {
                setIsLoading(false);
            }
        }

        loadAccount();
    }, []);

    const updateForm = (key: keyof AccountForm, value: string) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const confirmed = await confirm({
            title: "Save Account Changes",
            description: "Do you want to save the changes to your account information?",
            confirmText: "Save",
        });
        if (!confirmed) {
            return;
        }

        if (form.password || form.confirmPassword) {
            if (!form.currentPassword) {
                toast.error("Current password is required.");
                return;
            }
            if (form.password !== form.confirmPassword) {
                toast.error("Password confirmation does not match.");
                return;
            }
        }

        setIsSaving(true);
        const loadingToast = toast.loading("Updating account information...");
        try {
            const response = await apiFetch("/api/account", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    telNo: form.telNo,
                    email: form.email,
                    currentPassword: form.currentPassword || undefined,
                    password: form.password || undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                toast.error("Update failed.", { id: loadingToast, description: error.detail });
                return;
            }

            const payload = await response.json();
            const account = payload.account;
            setForm({
                userId: emptyIfNullish(account.userId),
                userName: emptyIfNullish(account.userName),
                corpId: emptyIfNullish(account.corpId),
                corpName: emptyIfNullish(account.corpName),
                telNo: emptyIfNullish(account.telNo),
                email: emptyIfNullish(account.email),
                currentPassword: "",
                password: "",
                confirmPassword: "",
            });
            await refresh();
            toast.success("Account information updated.", { id: loadingToast });
        } catch {
            toast.error("Network synchronization error.", { id: loadingToast });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {MessageDialog}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-l-4 border-[#001489] pl-4 md:pl-8">
                <div>
                    <h2 className="type-page-title text-slate-900 mb-2">
                        Account <span className="text-[#001489]">Settings</span>
                    </h2>
                
                </div>
            </div>

            <Card className="border-none shadow-2xl shadow-blue-900/5 bg-white rounded-2xl md:rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-[#001489]/5 p-6 md:p-8 border-b border-[#001489]/5">
                    <div className="flex items-center space-x-3">
                        <UserCog className="w-5 h-5 text-[#001489]" />
                        <CardTitle className="type-card-title text-slate-400">Profile Information</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                    {isLoading ? (
                        <div className="flex min-h-[320px] items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-[#001489] animate-spin" />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                                <Field label="ID" icon={IdCard}>
                                    <Input value={form.userId} disabled className="h-12 rounded-xl border-slate-100 bg-slate-100 type-control text-slate-500" />
                                </Field>
                                <Field label="Company" icon={Building2}>
                                    <Input value={form.corpName || form.corpId} disabled className="h-12 rounded-xl border-slate-100 bg-slate-100 type-control text-slate-500" />
                                </Field>
                                <Field label="Name" icon={UserCog}>
                                    <Input value={form.userName} disabled className="h-12 rounded-xl border-slate-100 bg-slate-100 type-control text-slate-500" />
                                </Field>
                                <Field label="Contact" icon={Phone}>
                                    <Input value={form.telNo} onChange={(event) => updateForm("telNo", event.target.value)} className="h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] type-control" />
                                </Field>
                                <Field label="Email" icon={AtSign}>
                                    <Input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} className="h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#001489] type-control" />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 rounded-2xl border border-slate-100 bg-slate-50/60 p-5 md:p-6">
                                <Field label="Current Password" icon={KeyRound}>
                                    <Input type="password" value={form.currentPassword} onChange={(event) => updateForm("currentPassword", event.target.value)} className="h-12 rounded-xl border-slate-100 bg-white focus:border-[#001489] type-control" />
                                </Field>
                                <Field label="New Password" icon={KeyRound}>
                                    <Input type="password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} className="h-12 rounded-xl border-slate-100 bg-white focus:border-[#001489] type-control" />
                                </Field>
                                <Field label="Confirm Password" icon={KeyRound}>
                                    <Input type="password" value={form.confirmPassword} onChange={(event) => updateForm("confirmPassword", event.target.value)} className="h-12 rounded-xl border-slate-100 bg-white focus:border-[#001489] type-control" />
                                </Field>
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSaving} className="h-12 rounded-xl bg-[#001489] px-7 type-action-sm hover:bg-blue-800">
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <label className="ml-1 flex items-center gap-2 type-label text-slate-400">
                <Icon className="h-3.5 w-3.5 text-[#001489]" />
                {label}
            </label>
            {children}
        </div>
    );
}
