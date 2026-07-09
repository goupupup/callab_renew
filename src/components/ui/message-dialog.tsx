"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type MessageDialogOptions = {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "info" | "warning";
};

type MessageDialogState = MessageDialogOptions & {
    mode: "alert" | "confirm";
    resolve: (value: boolean) => void;
};

export function useMessageDialog() {
    const [dialog, setDialog] = useState<MessageDialogState | null>(null);

    const openDialog = useCallback((mode: "alert" | "confirm", options: MessageDialogOptions) => {
        return new Promise<boolean>((resolve) => {
            setDialog({
                ...options,
                mode,
                resolve,
            });
        });
    }, []);

    const alert = useCallback(
        (options: MessageDialogOptions) => openDialog("alert", options),
        [openDialog],
    );

    const confirm = useCallback(
        (options: MessageDialogOptions) => openDialog("confirm", options),
        [openDialog],
    );

    const close = (value: boolean) => {
        dialog?.resolve(value);
        setDialog(null);
    };

    const Icon = dialog?.variant === "warning" ? AlertTriangle : CheckCircle2;

    const MessageDialog = (
        <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && close(false)}>
            <DialogContent className="max-w-md border-none bg-white p-0 shadow-2xl rounded-2xl overflow-hidden">
                {dialog && (
                    <>
                        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/70">
                            <div className="flex items-start gap-4">
                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${dialog.variant === "warning" ? "border-amber-100 bg-amber-50 text-amber-600" : "border-[#001489]/10 bg-[#001489]/5 text-[#001489]"}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="space-y-2 text-left">
                                    <DialogTitle className="text-base font-black tracking-tight text-slate-900">
                                        {dialog.title}
                                    </DialogTitle>
                                    {dialog.description && (
                                        <DialogDescription className="text-sm font-semibold leading-relaxed text-slate-500">
                                            {dialog.description}
                                        </DialogDescription>
                                    )}
                                </div>
                            </div>
                        </DialogHeader>
                        <DialogFooter className="p-5 bg-white">
                            {dialog.mode === "confirm" && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 rounded-xl border-slate-200 px-5 text-xs font-black uppercase tracking-widest"
                                    onClick={() => close(false)}
                                >
                                    {dialog.cancelText || "Cancel"}
                                </Button>
                            )}
                            <Button
                                type="button"
                                className="h-10 rounded-xl bg-[#001489] px-5 text-xs font-black uppercase tracking-widest hover:bg-blue-800"
                                onClick={() => close(true)}
                            >
                                {dialog.confirmText || "OK"}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );

    return { alert, confirm, MessageDialog };
}
