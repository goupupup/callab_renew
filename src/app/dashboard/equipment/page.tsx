"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { toast } from "sonner";
import {
    Search, FileText, Trash2, Eye,
    FileSpreadsheet, ChevronLeft, ChevronRight,
    Loader2, ShieldCheck, Upload,
    ChevronsLeft, ChevronsRight, Download
} from "lucide-react";
import { DownloadProgressBar, useDownloadProgress } from "@/components/download-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-client";

type EquipmentRow = {
    ISID: string;
    ACCN?: string;
    SERN?: string;
    MODL?: string;
    NAEM_SUP?: string;
    MNFC?: string;
    REGD?: string;
    LAST?: string;
    NEXT?: string;
    STAT?: string;
    CIDU?: string;
    MANUFACTURER_NAME?: string;
    CUSTOMER_NAME?: string;
};

type SessionUser = {
    role?: string;
};

export default function EquipmentPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-[#001489] animate-spin" />
            </div>
        }>
            <EquipmentContent />
        </Suspense>
    );
}

function EquipmentContent() {
    const { data: session } = useAuth();
    const { progress, downloadWithProgress } = useDownloadProgress();
    const searchParams = useSearchParams();
    const filterParam = searchParams.get("filter");

    const [sortConfig, setSortConfig] = useState({
        key: "regDate",
        direction: "desc"
    });

    const formatDate = (dateString: unknown) => {
        if (!dateString) return "---";
        const val = dateString.toString().trim();
        if (val === "0" || val === "" || val.length !== 8 || val === "00000000") return "---";

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const year = val.substring(0, 4);
        const monthIdx = parseInt(val.substring(4, 6)) - 1;
        const day = val.substring(6, 8);

        if (monthIdx < 0 || monthIdx > 11) return "---";
        return `${months[monthIdx]}-${day}-${year}`;
    };

    const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 1
    });

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [bulkDownloadType, setBulkDownloadType] = useState<"report" | "data" | null>(null);
    const hasInitialFetched = useRef(false);

    // Search Filters
    const [filters, setFilters] = useState({
        serialNumber: "",
        assetNo: "",
        regNo: "",
        modelName: "",
        equipmentName: "",
        company: "",
        manufacturer: "",
        lastCalStart: "",
        lastCalEnd: "",
        nextCalStart: "",
        nextCalEnd: "",
        onGoingOnly: filterParam === "onGoingOnly",
        expirationOnly: filterParam === "expirationOnly"
    });

    const user = session?.user as SessionUser | undefined;
    const isMaster = user?.role === "MASTER";
    const isEmployee = user?.role === "EMPLOYEE";
    const isElevated = isMaster || isEmployee;

    const fetchEquipment = useCallback(async (page = 1, limit = pagination.limit, sort = sortConfig, currentFilters = filters) => {
        const isFirstLoad = equipment.length === 0;
        if (isFirstLoad) {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }

        try {
            const queryParams = new URLSearchParams();
            Object.entries(currentFilters).forEach(([key, value]) => {
                if (value !== "" && value !== false && value !== "ALL") {
                    queryParams.append(key, value.toString());
                }
            });
            queryParams.append("page", page.toString());
            queryParams.append("limit", limit.toString());
            queryParams.append("sortBy", sort.key);
            queryParams.append("order", sort.direction);

            const response = await apiFetch(`/api/equipment?${queryParams.toString()}`);
            if (response.ok) {
                const result = await response.json();
                setEquipment(result.data);
                setPagination(result.pagination);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Data Sync Failed");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [pagination.limit, sortConfig, filters, equipment.length]);

    useEffect(() => {
        if (session && !hasInitialFetched.current) {
            fetchEquipment();
            hasInitialFetched.current = true;
        }
    }, [session, fetchEquipment]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchEquipment(1);
    };

    const handleSort = (key: string) => {
        const direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
        const newSort = { key, direction };
        setSortConfig(newSort);
        fetchEquipment(1, pagination.limit, newSort);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchEquipment(newPage);
        }
    };

    const handleLimitChange = (newLimit: number) => {
        fetchEquipment(1, newLimit);
    };

    const handleFileDownload = async (id: string, type: "data" | "report", calNo?: string) => {
        const loadingToast = toast.loading("Connecting to secure server...");
        try {
            const params = new URLSearchParams({ id, type });
            if (calNo) {
                params.append("calno", calNo);
            }
            const fileName = await downloadWithProgress({
                path: `/api/equipment/download?${params.toString()}`,
                title: type === "report" ? "Certificate Download" : "Data File Download",
                fallbackFilename: `${id}_${type}.${type === "report" ? "pdf" : "zip"}`,
            });
            toast.success("Download Initialized", { description: fileName, id: loadingToast });
        } catch (error) {
            toast.error("Download failed", { description: error instanceof Error ? error.message : "FTP connection failed.", id: loadingToast });
        }
    };

    const handleFileUpload = async (id: string) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".xlsx,.zip,.txt,.pdf";
        input.onchange = async (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;
            const loadingToast = toast.loading(`Uploading protocol data for ${id}...`);
            try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("id", id);
                const res = await apiFetch("/api/equipment/upload", { method: "POST", body: formData });
                if (res.ok) {
                    toast.success("Sector index updated.", { description: `File: ${file.name}`, id: loadingToast });
                } else {
                    const error = await res.json();
                    toast.error("Handshake failed", { description: error.error, id: loadingToast });
                }
            } catch {
                toast.error("Telemetry link lost during upload.", { id: loadingToast });
            }
        };
        input.click();
    };

    const handleExcelExport = async () => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value.toString());
        });
        params.append("sortBy", sortConfig.key);
        params.append("order", sortConfig.direction);
        params.append("page", pagination.page.toString());
        params.append("limit", pagination.limit.toString());
        try {
            await downloadWithProgress({
                path: `/api/equipment/export?${params.toString()}`,
                title: "Excel Export",
                fallbackFilename: "Equipment_Export.xlsx",
            });
        } catch (error) {
            toast.error("Excel export failed", { description: error instanceof Error ? error.message : "Download failed." });
        }
    };

    const handleBulkDownload = async (type: "report" | "data") => {
        if (equipment.length === 0) {
            toast.error("No records to download", { description: "Search equipment first, then run bulk download." });
            return;
        }
        if (equipment.length > 200) {
            window.alert("Bulk download is limited to 200 rows at a time. Please reduce the table rows to 200 or fewer and try again.");
            return;
        }

        const title = type === "report" ? "Bulk Certificate Download" : "Bulk Data Download";
        const loadingToast = toast.loading(`${title} preparing...`);
        setBulkDownloadType(type);
        try {
            const fileName = await downloadWithProgress({
                path: "/api/equipment/cert-download/bulk",
                title,
                fallbackFilename: `CALLAB_${type}_bulk.zip`,
                init: {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type,
                        items: equipment.map((item) => ({
                            ISID: item.ISID,
                            CIDU: item.CIDU || "",
                        })),
                    }),
                },
            });
            toast.success(title, { description: fileName, id: loadingToast });
        } catch (error) {
            toast.error(title, { description: error instanceof Error ? error.message : "Network synchronization error.", id: loadingToast });
        } finally {
            setBulkDownloadType(null);
        }
    };

    // Dynamic Pagination Logic (Centered 5-page window)
    const getPageRange = () => {
        const total = pagination.totalPages;
        const current = pagination.page;
        const maxVisible = 5;

        if (total <= maxVisible) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        let start = Math.max(1, current - Math.floor(maxVisible / 2));
        let end = start + maxVisible - 1;

        if (end > total) {
            end = total;
            start = Math.max(1, end - maxVisible + 1);
        }

        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <DownloadProgressBar progress={progress} />
            {/* Search Filters Card */}
            <Card className="border-slate-100 shadow-sm rounded-2xl md:rounded-3xl overflow-hidden mt-0">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-6 text-slate-500">
                    <CardTitle className="type-card-title flex items-center">
                        <Search className="w-3.5 h-3.5 mr-3 text-[#001489]" />
                        Asset Search & Filter System
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                    <form onSubmit={handleSearch} className="space-y-4 md:space-y-6">
                        <div className="flex flex-col gap-4 md:gap-6">
                            {/* Company Filter (Master Only) */}
                            {isElevated && (
                                <div className="p-3 md:p-4 bg-slate-50/50 rounded-xl md:rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                                    <label className="type-table-head text-slate-500 md:w-32">Customer</label>
                                    <Input
                                        placeholder="Enter Company Name or ID..."
                                        className="h-10 md:h-12 rounded-xl border-slate-200 bg-white focus:border-[#001489] transition-all type-control text-slate-900 flex-1 md:max-w-2xl"
                                        value={filters.company}
                                        onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                                    />
                                </div>
                            )}

                            {/* Main Filters Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                <div className="space-y-1.5">
                                    <label className="type-label text-slate-400 ml-1">Serial Number</label>
                                    <Input
                                        placeholder="Serial ID..."
                                        className="h-10 md:h-12 rounded-xl border-slate-200 bg-white type-control text-slate-900"
                                        value={filters.serialNumber}
                                        onChange={(e) => setFilters({ ...filters, serialNumber: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="type-label text-slate-400 ml-1">Asset No</label>
                                    <Input
                                        placeholder="Asset No..."
                                        className="h-10 md:h-12 rounded-xl border-slate-200 bg-white type-control text-slate-900"
                                        value={filters.assetNo}
                                        onChange={(e) => setFilters({ ...filters, assetNo: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="type-label text-slate-400 ml-1">HCT Registration</label>
                                    <Input
                                        placeholder="HCT No..."
                                        className="h-10 md:h-12 rounded-xl border-slate-200 bg-white type-control text-slate-900"
                                        value={filters.regNo}
                                        onChange={(e) => setFilters({ ...filters, regNo: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="type-label text-slate-400 ml-1">Model Name</label>
                                    <Input
                                        placeholder="Model..."
                                        className="h-10 md:h-12 rounded-xl border-slate-200 bg-white type-control text-slate-900"
                                        value={filters.modelName}
                                        onChange={(e) => setFilters({ ...filters, modelName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="type-label text-slate-400 ml-1">Equipment Name</label>
                                    <Input
                                        placeholder="Name..."
                                        className="h-10 md:h-12 rounded-xl border-slate-200 bg-white type-control text-slate-900"
                                        value={filters.equipmentName}
                                        onChange={(e) => setFilters({ ...filters, equipmentName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="type-label text-slate-400 ml-1">Manufacturer</label>
                                    <Input
                                        placeholder="Mnfr..."
                                        className="h-10 md:h-12 rounded-xl border-slate-200 bg-white type-control text-slate-900"
                                        value={filters.manufacturer}
                                        onChange={(e) => setFilters({ ...filters, manufacturer: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Calibration Date Filters */}
                            <div className="flex flex-col xl:flex-row gap-4 md:gap-6 border-t border-slate-100 pt-4 md:pt-6">
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4">
                                    <label className="type-label text-slate-500 sm:w-32">Last Calibration</label>
                                    <div className="flex items-center gap-2 flex-1">
                                        <Input type="date" className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900 flex-1" value={filters.lastCalStart} onChange={(e) => setFilters({ ...filters, lastCalStart: e.target.value })} />
                                        <span className="type-control-sm text-slate-300 text-center min-w-[12px]">~</span>
                                        <Input type="date" className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900 flex-1" value={filters.lastCalEnd} onChange={(e) => setFilters({ ...filters, lastCalEnd: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4">
                                    <label className="type-label text-slate-500 sm:w-32">Next Calibration</label>
                                    <div className="flex items-center gap-2 flex-1">
                                        <Input type="date" className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900 flex-1" value={filters.nextCalStart} onChange={(e) => setFilters({ ...filters, nextCalStart: e.target.value })} />
                                        <span className="type-control-sm text-slate-300 text-center min-w-[12px]">~</span>
                                        <Input type="date" className="h-10 rounded-xl border-slate-200 bg-white type-control-sm text-slate-900 flex-1" value={filters.nextCalEnd} onChange={(e) => setFilters({ ...filters, nextCalEnd: e.target.value })} />
                                    </div>
                                </div>
                                <div className="xl:min-w-[180px] flex items-end">
                                    <Button type="submit" className="h-10 md:h-12 w-full bg-[#001489] hover:bg-[#001489]/90 text-white rounded-xl shadow-lg shadow-blue-900/10 type-action">
                                        <Search className="w-4 h-4 mr-2" />
                                        SEARCH
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Equipment Data Table */}
            <Card className="border-none shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] rounded-2xl md:rounded-[2.5rem] overflow-hidden bg-white mt-4">
                <CardHeader className="px-6 md:px-10 py-4 md:py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-50">
                    <CardTitle className="type-panel-title text-slate-400 flex items-center">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-orange-50 flex items-center justify-center mr-3 md:mr-5 shadow-inner">
                            <FileText className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                        </div>
                        Secure Asset Registry
                        {isRefreshing && (
                            <div className="ml-4 md:ml-8 flex items-center text-[#001489]">
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                <span className="type-caption tracking-[0.2em] opacity-60">SYNCING...</span>
                            </div>
                        )}
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-8">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                variant="outline"
                                size="xs"
                                className="h-8 px-3 rounded-lg border-slate-200 bg-white type-caption text-slate-700 hover:bg-slate-50 shadow-sm w-full sm:w-auto"
                                onClick={handleExcelExport}
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                                Excel Export
                            </Button>
                            <Button
                                size="xs"
                                className="h-8 px-3 rounded-lg bg-[#001489] hover:bg-[#001489]/90 type-caption shadow-sm w-full sm:w-auto"
                                disabled={bulkDownloadType !== null || equipment.length === 0}
                                onClick={() => handleBulkDownload("report")}
                            >
                                {bulkDownloadType === "report" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                                Bulk Cert Download
                            </Button>
                            <Button
                                variant="outline"
                                size="xs"
                                className="h-8 px-3 rounded-lg border-[#001489]/20 bg-white type-caption text-[#001489] hover:bg-[#001489]/5 shadow-sm w-full sm:w-auto"
                                disabled={bulkDownloadType !== null || equipment.length === 0}
                                onClick={() => handleBulkDownload("data")}
                            >
                                {bulkDownloadType === "data" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />}
                                Bulk Data Download
                            </Button>
                        </div>
                        <div className="flex items-center space-x-6 sm:space-x-8">
                            <label className="flex items-center space-x-2 md:space-x-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        className="peer w-4 h-4 md:w-5 md:h-5 rounded-md md:rounded-lg border-2 border-slate-200 text-[#001489] focus:ring-0 appearance-none checked:bg-[#001489]"
                                        checked={filters.onGoingOnly}
                                        onChange={(e) => {
                                            const newFilters = { ...filters, onGoingOnly: e.target.checked };
                                            setFilters(newFilters);
                                            fetchEquipment(1, pagination.limit, sortConfig, newFilters);
                                        }}
                                    />
                                    <ShieldCheck className="absolute w-2.5 h-2.5 md:w-3 md:h-3 text-white left-[3px] md:left-1 opacity-0 peer-checked:opacity-100" />
                                </div>
                                <span className="type-label-sm text-slate-400 group-hover:text-[#001489]">On-Going</span>
                            </label>
                            <label className="flex items-center space-x-2 md:space-x-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        className="peer w-4 h-4 md:w-5 md:h-5 rounded-md md:rounded-lg border-2 border-slate-200 text-rose-600 appearance-none checked:bg-rose-600"
                                        checked={filters.expirationOnly}
                                        onChange={(e) => {
                                            const newFilters = { ...filters, expirationOnly: e.target.checked };
                                            setFilters(newFilters);
                                            fetchEquipment(1, pagination.limit, sortConfig, newFilters);
                                        }}
                                    />
                                    <Trash2 className="absolute w-2.5 h-2.5 md:w-3 md:h-3 text-white left-[3px] md:left-1 opacity-0 peer-checked:opacity-100" />
                                </div>
                                <span className="type-label-sm text-slate-400 group-hover:text-rose-600">Expiring</span>
                            </label>
                        </div>
                        <select
                            className="h-9 md:h-10 rounded-lg md:rounded-xl border border-slate-100 bg-slate-50/50 px-3 md:px-4 type-label-sm text-slate-600 shadow-sm"
                            value={pagination.limit}
                            onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                        >
                            <option value="25">SHOW: 25</option>
                            <option value="50">SHOW: 50</option>
                            <option value="100">SHOW: 100</option>
                            <option value="9999">SHOW: ALL</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto custom-scrollbar">
                        <Table className="min-w-[1300px] md:min-w-full">
                            <TableHeader className="bg-slate-50/30 border-b border-slate-100">
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableHead className="w-16 text-center type-table-head py-4 text-slate-400">ID</TableHead>
                                    <TableHead className="w-24 text-center type-table-head py-4 text-slate-400">DATA</TableHead>
                                    <TableHead className="w-20 text-center type-table-head py-4 text-slate-400">Reports</TableHead>
                                    {isElevated && (
                                        <TableHead className="type-table-head py-4 text-slate-900 px-6">Customer</TableHead>
                                    )}
                                    <TableHead className="type-table-head py-4 text-slate-900 px-6 cursor-pointer group" onClick={() => handleSort("assetNo")}>
                                        <div className="flex items-center space-x-2 group-hover:text-[#001489]">
                                            <span>Asset #</span>
                                            {sortConfig.key === "assetNo" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                                        </div>
                                    </TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-6 cursor-pointer group" onClick={() => handleSort("hctNo")}>
                                        <div className="flex items-center space-x-2 group-hover:text-[#001489]">
                                            <span>HCT No</span>
                                            {sortConfig.key === "hctNo" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                                        </div>
                                    </TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-6">Equipment Name</TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-6">Model/Manu</TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-6">Serial ID</TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-6">Cal Date</TableHead>
                                    <TableHead className="text-right type-table-head py-4 text-slate-900 px-6">Next Cycle</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={isElevated ? 11 : 10} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                <div className="w-10 h-10 border-4 border-slate-50 border-t-[#001489] rounded-full animate-spin" />
                                                <p className="type-card-title text-slate-400">Syncing telemetry data...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : equipment.length > 0 ? (
                                    equipment.map((item, index) => {
                                        const isExpired = item.NEXT && new Date(item.NEXT.substring(0, 4) + '-' + item.NEXT.substring(4, 6) + '-' + item.NEXT.substring(6, 8)) < new Date();
                                        return (
                                            <TableRow key={item.ISID} className="border-b border-slate-50/50 hover:bg-slate-50/50 transition-all group/row">
                                                <TableCell className="text-center type-nav-item text-slate-300 py-2.5">{((pagination.page - 1) * pagination.limit + index + 1).toString().padStart(2, '0')}</TableCell>
                                                <TableCell className="py-2.5">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <Eye className="w-4.5 h-4.5 text-slate-400 cursor-pointer hover:text-[#001489] transition-colors" onClick={() => handleFileDownload(item.ISID, "data")} />
                                                        {isElevated && <Upload className="w-4 h-4 text-slate-300 cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => handleFileUpload(item.ISID)} />}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2.5 text-center">
                                                    <Search className="w-4.5 h-4.5 text-slate-400 cursor-pointer hover:text-[#001489] inline-block" onClick={() => handleFileDownload(item.ISID, "report", item.CIDU)} />
                                                </TableCell>
                                                {isElevated && (
                                                    <TableCell className="py-2.5 px-6">
                                                        <p className="type-label text-[#001489] truncate max-w-[120px]" title={item.CUSTOMER_NAME}>
                                                            {item.CUSTOMER_NAME || "---"}
                                                        </p>
                                                    </TableCell>
                                                )}
                                                <TableCell className="py-2.5 px-6 type-table-body-strong text-slate-900">{item.ACCN || "---"}</TableCell>
                                                <TableCell className="py-2.5 px-6 type-table-body-strong text-[#001489] tracking-wider">{item.ISID}</TableCell>
                                                <TableCell className="py-2.5 px-6"><p className="type-table-body-strong text-slate-900 uppercase tracking-tight line-clamp-1 max-w-[250px]">{item.NAEM_SUP}</p></TableCell>
                                                <TableCell className="py-2.5 px-6">
                                                    <p className="type-table-body text-slate-900 font-mono italic truncate w-32">{item.MODL}</p>
                                                    <p className="type-label text-slate-400 mt-1 truncate w-32">
                                                        {item.MANUFACTURER_NAME || "Manufacturer N/A"}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="py-2.5 px-6 font-mono type-table-body-strong text-slate-700">{item.SERN}</TableCell>
                                                <TableCell className="py-2.5 px-6 font-mono type-table-body text-slate-500">{formatDate(item.LAST)}</TableCell>
                                                <TableCell className="py-2.5 px-6 text-right">
                                                    <div className={`inline-flex items-center px-3 py-1 rounded-lg type-table-body-strong ${isExpired ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                        {formatDate(item.NEXT)}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={isElevated ? 11 : 10} className="h-64 text-center text-slate-300 type-table-head">No Records Found</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 md:px-10 py-6 md:py-8 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/20">
                        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full md:w-auto">
                            <div className="flex flex-col items-center sm:items-start">
                                <span className="type-label-sm text-slate-400 mb-1">Index Status</span>
                                <span className="type-table-body-strong text-slate-900 uppercase">TOTAL: {pagination.total}</span>
                            </div>
                        </div>

                        {pagination.totalPages > 1 && pagination.limit < 9999 && (
                            <div className="flex items-center gap-2 md:gap-3">
                                {/* First Page */}
                                <Button variant="ghost" size="icon" className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl text-slate-400" onClick={() => handlePageChange(1)} disabled={pagination.page === 1}>
                                    <ChevronsLeft className="w-5 h-5" />
                                </Button>

                                <Button variant="ghost" size="icon" className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl text-slate-400" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>

                                <div className="flex items-center gap-1.5 md:gap-2">
                                    {getPageRange().map((pageNum) => (
                                        <Button
                                            key={pageNum}
                                            className={`w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl type-action-sm ${pagination.page === pageNum ? 'bg-[#001489] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                                            onClick={() => handlePageChange(pageNum)}
                                        >
                                            {pageNum.toString().padStart(2, '0')}
                                        </Button>
                                    ))}
                                </div>

                                <Button variant="ghost" size="icon" className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl text-slate-400" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>
                                    <ChevronRight className="w-5 h-5" />
                                </Button>

                                {/* Last Page */}
                                <Button variant="ghost" size="icon" className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl text-slate-400" onClick={() => handlePageChange(pagination.totalPages)} disabled={pagination.page === pagination.totalPages}>
                                    <ChevronsRight className="w-5 h-5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
