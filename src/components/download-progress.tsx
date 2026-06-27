"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Download, Loader2 } from "lucide-react";

import { apiFetch } from "@/lib/api-client";

type DownloadProgressState = {
    visible: boolean;
    title: string;
    filename: string;
    receivedBytes: number;
    totalBytes: number;
    percent: number | null;
    status: "preparing" | "downloading" | "complete" | "error";
};

type DownloadRequest = {
    path: string;
    init?: RequestInit;
    title: string;
    fallbackFilename: string;
};

const initialState: DownloadProgressState = {
    visible: false,
    title: "",
    filename: "",
    receivedBytes: 0,
    totalBytes: 0,
    percent: null,
    status: "preparing",
};

export function useDownloadProgress() {
    const [progress, setProgress] = useState<DownloadProgressState>(initialState);

    const resetProgress = useCallback(() => setProgress(initialState), []);

    const downloadBlob = useCallback((blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.style.display = "none";
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(anchor);
        }, 1000);
    }, []);

    const showGeneratedDownload = useCallback(
        (blob: Blob, filename: string, title = "Download") => {
            setProgress({
                visible: true,
                title,
                filename,
                receivedBytes: blob.size,
                totalBytes: blob.size,
                percent: 100,
                status: "complete",
            });
            downloadBlob(blob, filename);
            window.setTimeout(resetProgress, 1400);
        },
        [downloadBlob, resetProgress],
    );

    const downloadWithProgress = useCallback(
        async ({ path, init, title, fallbackFilename }: DownloadRequest) => {
            setProgress({
                visible: true,
                title,
                filename: fallbackFilename,
                receivedBytes: 0,
                totalBytes: 0,
                percent: null,
                status: "preparing",
            });

            const response = await apiFetch(path, init);
            if (!response.ok) {
                let message = "Download failed.";
                try {
                    const error = await response.json();
                    message = error.detail || error.error || message;
                } catch {
                    // Keep default message for non-JSON responses.
                }
                setProgress((current) => ({ ...current, status: "error" }));
                window.setTimeout(resetProgress, 1800);
                throw new Error(message);
            }

            const filename = filenameFromDisposition(response.headers.get("Content-Disposition")) || fallbackFilename;
            const totalBytes = Number(response.headers.get("Content-Length") || 0);
            const reader = response.body?.getReader();

            if (!reader) {
                const blob = await response.blob();
                setProgress({
                    visible: true,
                    title,
                    filename,
                    receivedBytes: blob.size,
                    totalBytes: blob.size,
                    percent: 100,
                    status: "complete",
                });
                downloadBlob(blob, filename);
                window.setTimeout(resetProgress, 1400);
                return filename;
            }

            const chunks: ArrayBuffer[] = [];
            let receivedBytes = 0;
            setProgress((current) => ({
                ...current,
                filename,
                totalBytes,
                status: "downloading",
            }));

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!value) continue;
                const chunk = new Uint8Array(value.length);
                chunk.set(value);
                chunks.push(chunk.buffer);
                receivedBytes += value.length;
                setProgress((current) => ({
                    ...current,
                    receivedBytes,
                    totalBytes,
                    percent: totalBytes ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : null,
                    status: "downloading",
                }));
            }

            const blob = new Blob(chunks);
            setProgress({
                visible: true,
                title,
                filename,
                receivedBytes,
                totalBytes: totalBytes || receivedBytes,
                percent: 100,
                status: "complete",
            });
            downloadBlob(blob, filename);
            window.setTimeout(resetProgress, 1400);
            return filename;
        },
        [downloadBlob, resetProgress],
    );

    return {
        progress,
        resetProgress,
        downloadWithProgress,
        showGeneratedDownload,
    };
}

export function DownloadProgressBar({ progress }: { progress: DownloadProgressState }) {
    if (!progress.visible) return null;

    const subtitle =
        progress.status === "preparing"
            ? "Preparing files..."
            : progress.status === "complete"
                ? "Download ready"
                : progress.status === "error"
                    ? "Download failed"
                    : progress.percent === null
                        ? `${formatBytes(progress.receivedBytes)} received`
                        : `${formatBytes(progress.receivedBytes)} / ${formatBytes(progress.totalBytes)}`;

    return (
        <div className="fixed bottom-5 right-5 z-[300] w-[min(92vw,360px)] rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#001489]/10 text-[#001489]">
                        {progress.status === "complete" ? (
                            <CheckCircle2 className="h-4 w-4" />
                        ) : progress.status === "preparing" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                            <p className="type-table-body-strong text-slate-900">{progress.title}</p>
                            <p className="type-caption text-slate-400">{progress.percent === null ? "" : `${progress.percent}%`}</p>
                        </div>
                        <p className="type-table-body text-slate-400 truncate">{progress.filename || subtitle}</p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={`h-full rounded-full bg-[#001489] transition-all duration-300 ${progress.percent === null ? "w-1/3 animate-pulse" : ""}`}
                                style={progress.percent === null ? undefined : { width: `${progress.percent}%` }}
                            />
                        </div>
                        <p className="mt-2 type-caption text-slate-400">{subtitle}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function filenameFromDisposition(contentDisposition: string | null) {
    if (!contentDisposition) return "";
    const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (filenameStarMatch) return decodeURIComponent(filenameStarMatch[1]);
    if (filenameMatch) return filenameMatch[1];
    return "";
}

function formatBytes(bytes: number) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** index;
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}
