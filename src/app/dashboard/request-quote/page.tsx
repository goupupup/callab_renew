"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RequestQuotePage() {
    const router = useRouter();

    return (
        <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center">
            <Card className="w-full max-w-2xl border-slate-100 bg-white shadow-sm rounded-2xl md:rounded-[2rem] overflow-hidden">
                <CardContent className="p-8 md:p-12">
                    <div className="flex flex-col items-center text-center gap-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#001489]/5 text-[#001489] border border-[#001489]/10">
                            <ClipboardList className="h-8 w-8" />
                        </div>
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Request Quote</p>
                            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">Coming Soon</h1>
                            <p className="text-sm md:text-base font-semibold leading-relaxed text-slate-500">
                                The quote request workflow is being prepared.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl border-slate-200 px-5 text-xs font-black uppercase tracking-widest"
                            onClick={() => router.push("/dashboard")}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
