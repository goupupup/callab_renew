"use client";

import { FormEvent, useState } from "react";
import { Archive, Download, FileSpreadsheet, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { DownloadProgressBar, useDownloadProgress } from "@/components/download-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-client";

type CertDownloadRow = {
    ISID: string;
    CIDU?: string;
    ACCN?: string;
    NAEM_SUP?: string;
    MODL?: string;
    SERN?: string;
    CUSTOMER_NAME?: string;
    MANUFACTURER_NAME?: string;
    CAL_DATE?: string;
    RETURN_DATE?: string;
};

type SessionUser = {
    role?: string;
};

function formatDate(dateString: unknown) {
    if (!dateString) return "---";
    const val = dateString.toString().trim();
    if (val === "0" || val === "" || val.length !== 8 || val === "00000000") return "---";

    const year = val.substring(0, 4);
    const month = val.substring(4, 6);
    const day = val.substring(6, 8);
    return `${year}-${month}-${day}`;
}

export default function CertDownloadPage() {
    const { data: session } = useAuth();
    const { progress, downloadWithProgress } = useDownloadProgress();
    const user = session?.user as SessionUser | undefined;
    const isElevated = user?.role === "MASTER" || user?.role === "EMPLOYEE";

    const [filters, setFilters] = useState({
        company: "",
        regNo: "",
        equipmentName: "",
        modelName: "",
        manufacturer: "",
        calDateStart: "",
        calDateEnd: "",
        returnDateStart: "",
        returnDateEnd: "",
        limit: "500",
    });
    const [rows, setRows] = useState<CertDownloadRow[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [bulkDownloadType, setBulkDownloadType] = useState<"report" | "data" | null>(null);

    const buildParams = () => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value.toString());
        });
        return params;
    };

    const handleSearch = async (event: FormEvent) => {
        event.preventDefault();
        setIsSearching(true);
        try {
            const response = await apiFetch(`/api/equipment/cert-download/search?${buildParams().toString()}`);
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                toast.error("Search failed", { description: error.detail || "Unable to load calibration records." });
                return;
            }

            const result = await response.json();
            setRows(result.data || []);
            toast.success("Download candidates loaded", { description: `${result.total || 0} calibration records found.` });
        } catch {
            toast.error("Search failed", { description: "Network synchronization error." });
        } finally {
            setIsSearching(false);
        }
    };

    const handleBulkDownload = async (type: "report" | "data") => {
        if (rows.length === 0) {
            toast.error("Search first", { description: "Load matching calibration records before bulk download." });
            return;
        }

        const title = type === "report" ? "Bulk Certificate Download" : "Bulk Data File Download";
        const loadingToast = toast.loading(`${title} preparing...`);
        setBulkDownloadType(type);
        try {
            const params = buildParams();
            params.set("type", type);
            const fileName = await downloadWithProgress({
                path: `/api/equipment/cert-download/bulk?${params.toString()}`,
                title,
                fallbackFilename: `CALLAB_${type}_bulk.zip`,
            });
            toast.success(title, { description: fileName, id: loadingToast });
        } catch (error) {
            toast.error(title, { description: error instanceof Error ? error.message : "Network synchronization error.", id: loadingToast });
        } finally {
            setBulkDownloadType(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <DownloadProgressBar progress={progress} />
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-l-4 border-[#001489] pl-4 md:pl-8">
                <div>
                    <h2 className="type-page-title text-slate-900 mb-2">
                        Cert <span className="text-[#001489]">Download</span>
                    </h2>
                    <p className="type-page-meta text-slate-400">
                        Bulk certificate and data file download by calibration or return date.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                        type="button"
                        onClick={() => handleBulkDownload("report")}
                        disabled={rows.length === 0 || bulkDownloadType !== null}
                        className="h-11 rounded-xl bg-[#001489] hover:bg-[#001489]/90 type-action shadow-lg shadow-blue-900/10"
                    >
                        {bulkDownloadType === "report" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        Bulk Certificate Download
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleBulkDownload("data")}
                        disabled={rows.length === 0 || bulkDownloadType !== null}
                        className="h-11 rounded-xl border-[#001489]/20 text-[#001489] hover:bg-[#001489]/5 type-action shadow-sm"
                    >
                        {bulkDownloadType === "data" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                        Bulk Data File Download
                    </Button>
                </div>
            </div>

            <Card className="border-slate-100 shadow-sm rounded-2xl md:rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-6 text-slate-600">
                    <CardTitle className="type-card-title flex items-center text-slate-600">
                        <Archive className="w-3.5 h-3.5 mr-3 text-[#001489]" />
                        Download Search Conditions
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                    <form onSubmit={handleSearch} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                            {isElevated && (
                                <div className="space-y-1.5">
                                    <label className="type-label text-slate-400 ml-1">Company</label>
                                    <Input
                                        placeholder="Company name or code"
                                        className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900"
                                        value={filters.company}
                                        onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                                    />
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="type-label text-slate-400 ml-1">HCT Registration</label>
                                <Input
                                    placeholder="REG NO"
                                    className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900"
                                    value={filters.regNo}
                                    onChange={(e) => setFilters({ ...filters, regNo: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="type-label text-slate-400 ml-1">Equipment Name</label>
                                <Input
                                    placeholder="Equipment"
                                    className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900"
                                    value={filters.equipmentName}
                                    onChange={(e) => setFilters({ ...filters, equipmentName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="type-label text-slate-400 ml-1">Model</label>
                                <Input
                                    placeholder="Model"
                                    className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900"
                                    value={filters.modelName}
                                    onChange={(e) => setFilters({ ...filters, modelName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="type-label text-slate-400 ml-1">Manufacturer</label>
                                <Input
                                    placeholder="Maker"
                                    className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900"
                                    value={filters.manufacturer}
                                    onChange={(e) => setFilters({ ...filters, manufacturer: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_120px_auto] gap-4 items-end border-t border-slate-100 pt-5">
                            <div className="space-y-1.5">
                                <label className="type-label text-slate-500 ml-1">Calibration Date Range</label>
                                <div className="flex items-center gap-2">
                                    <Input type="date" className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900" value={filters.calDateStart} onChange={(e) => setFilters({ ...filters, calDateStart: e.target.value })} />
                                    <span className="type-control-sm text-slate-300">~</span>
                                    <Input type="date" className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900" value={filters.calDateEnd} onChange={(e) => setFilters({ ...filters, calDateEnd: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="type-label text-slate-500 ml-1">Return Date Range</label>
                                <div className="flex items-center gap-2">
                                    <Input type="date" className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900" value={filters.returnDateStart} onChange={(e) => setFilters({ ...filters, returnDateStart: e.target.value })} />
                                    <span className="type-control-sm text-slate-300">~</span>
                                    <Input type="date" className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900" value={filters.returnDateEnd} onChange={(e) => setFilters({ ...filters, returnDateEnd: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="type-label text-slate-500 ml-1">Limit</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={2000}
                                    className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900"
                                    value={filters.limit}
                                    onChange={(e) => setFilters({ ...filters, limit: e.target.value })}
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isSearching}
                                className="h-10 rounded-xl bg-slate-950 hover:bg-[#001489] type-action px-6"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                                Search Files
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-none shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] rounded-2xl md:rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="px-6 md:px-10 py-4 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50">
                    <CardTitle className="type-panel-title text-slate-400 flex items-center">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-50 flex items-center justify-center mr-3 md:mr-5 shadow-inner">
                            <Archive className="w-4 h-4 md:w-5 md:h-5 text-[#001489]" />
                        </div>
                        Bulk Download Candidates
                    </CardTitle>
                    <div className="type-table-body-strong text-slate-900 uppercase">
                        TOTAL: {rows.length}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[980px]">
                            <thead className="bg-slate-50/80 border-b border-slate-100">
                                <tr>
                                    {["REG NO", "CAL NO", "Equipment", "Model", "Serial", "Company", "Manufacturer", "Cal Date", "Return Date"].map((header) => (
                                        <th key={header} className="px-5 py-3 type-label-sm text-slate-400">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isSearching ? (
                                    <tr>
                                        <td colSpan={9} className="h-48 text-center">
                                            <Loader2 className="w-7 h-7 text-[#001489] animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="h-48 text-center type-table-body text-slate-300">
                                            Search conditions to prepare bulk certificate or data downloads.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => (
                                        <tr key={`${row.ISID}-${row.CIDU}`} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-5 py-3 type-nav-item text-[#001489]">{row.ISID}</td>
                                            <td className="px-5 py-3 type-table-body-strong text-slate-700">{row.CIDU || "---"}</td>
                                            <td className="px-5 py-3 type-table-body text-slate-700 max-w-[220px] truncate">{row.NAEM_SUP || "---"}</td>
                                            <td className="px-5 py-3 type-table-body text-slate-500">{row.MODL || "---"}</td>
                                            <td className="px-5 py-3 type-table-body text-slate-500">{row.SERN || "---"}</td>
                                            <td className="px-5 py-3 type-table-body text-slate-500 max-w-[180px] truncate">{row.CUSTOMER_NAME || "---"}</td>
                                            <td className="px-5 py-3 type-table-body text-slate-500 max-w-[180px] truncate">{row.MANUFACTURER_NAME || "---"}</td>
                                            <td className="px-5 py-3 type-table-body text-slate-500">{formatDate(row.CAL_DATE)}</td>
                                            <td className="px-5 py-3 type-table-body text-slate-500">{formatDate(row.RETURN_DATE)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
