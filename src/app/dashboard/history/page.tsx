"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Download,
    FileSpreadsheet,
    History,
    Loader2,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Search,
} from "lucide-react";
import { DownloadProgressBar, useDownloadProgress } from "@/components/download-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMessageDialog } from "@/components/ui/message-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";

type HistoryRow = {
    ISID: string;
    CIDU: string;
    ACCN?: string;
    NAEM_SUP?: string;
    MODL?: string;
    SERN?: string;
    CUSTOMER_NAME?: string;
    MANUFACTURER_NAME?: string;
    CAL_DATE?: string;
    RETURN_DATE?: string;
};

type SearchType = "regNo" | "assetNo";
type SortDirection = "asc" | "desc";
type SortConfig = {
    key: string;
    direction: SortDirection;
};

export default function HistoryPage() {
    const { progress, downloadWithProgress } = useDownloadProgress();
    const { alert, confirm, MessageDialog } = useMessageDialog();
    const [searchType, setSearchType] = useState<SearchType>("regNo");
    const [keyword, setKeyword] = useState("");
    const [rows, setRows] = useState<HistoryRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [bulkDownloading, setBulkDownloading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 0,
    });
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: "calNo",
        direction: "desc",
    });

    const buildParams = (page = pagination.page, limit = pagination.limit, sort = sortConfig) => {
        const params = new URLSearchParams();
        params.append("searchType", searchType);
        params.append("keyword", keyword.trim());
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        params.append("sortBy", sort.key);
        params.append("order", sort.direction);
        return params;
    };

    const fetchHistory = async (page = 1, limit = pagination.limit, sort = sortConfig) => {
        if (!keyword.trim()) {
            await alert({
                title: "Search Required",
                description: "Enter an HCT registration number or asset number before searching.",
                variant: "warning",
            });
            return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 30000);

        if (!hasSearched) {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }

        try {
            const response = await apiFetch(`/api/equipment/history?${buildParams(page, limit, sort).toString()}`, {
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "History search failed.");
            }
            const result = await response.json();
            setRows(result.data || []);
            setPagination(result.pagination || { total: 0, page, limit, totalPages: 0 });
            setHasSearched(true);
        } catch (error) {
            toast.error("History search failed", {
                description: error instanceof Error && error.name === "AbortError"
                    ? "The history search timed out. Please narrow the search and try again."
                    : error instanceof Error ? error.message : "Unable to load calibration history.",
            });
        } finally {
            window.clearTimeout(timeoutId);
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleSearch = (event: FormEvent) => {
        event.preventDefault();
        fetchHistory(1, pagination.limit);
    };

    const handleLimitChange = (limit: number) => {
        fetchHistory(1, limit, sortConfig);
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= pagination.totalPages) {
            fetchHistory(page, pagination.limit, sortConfig);
        }
    };

    const handleSort = (key: string) => {
        const direction: SortDirection = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
        const newSort = { key, direction };
        setSortConfig(newSort);
        fetchHistory(1, pagination.limit, newSort);
    };

    const renderSortHeader = (label: string, key: string) => {
        const isActive = sortConfig.key === key;
        const Icon = isActive ? (sortConfig.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
        return (
            <button
                type="button"
                onClick={() => handleSort(key)}
                className="flex w-full items-center justify-start gap-2 group-hover:text-[#001489]"
            >
                <span>{label}</span>
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#001489]" : "text-slate-300"}`} />
            </button>
        );
    };

    const activeFilters = [
        keyword.trim() && `${searchType === "regNo" ? "HCT No" : "Asset No"}: ${keyword.trim()}`,
    ].filter(Boolean);
    const visibleStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const visibleEnd = pagination.limit >= 9999 ? rows.length : Math.min(pagination.page * pagination.limit, pagination.total);
    const sortLabel = `${sortConfig.key} ${sortConfig.direction.toUpperCase()}`;

    const handleExcelExport = async () => {
        if (rows.length === 0) {
            toast.error("No records to export", { description: "Search calibration history first." });
            return;
        }

        try {
            await downloadWithProgress({
                path: `/api/equipment/history/export?${buildParams(pagination.page, pagination.limit, sortConfig).toString()}`,
                title: "History Excel Export",
                fallbackFilename: "Calibration_History.xlsx",
            });
        } catch (error) {
            toast.error("Excel export failed", {
                description: error instanceof Error ? error.message : "Download failed.",
            });
        }
    };

    const handleCertificateDownload = async (row: HistoryRow) => {
        const loadingToast = toast.loading(`Downloading certificate ${row.CIDU}...`);
        try {
            const params = new URLSearchParams({ id: row.ISID, type: "report", calno: row.CIDU });
            const fileName = await downloadWithProgress({
                path: `/api/equipment/download?${params.toString()}`,
                title: "Certificate Download",
                fallbackFilename: `${row.ACCN || row.ISID}_${row.CIDU}.pdf`,
            });
            toast.success("Certificate download started", { description: fileName, id: loadingToast });
        } catch (error) {
            toast.error("Certificate download failed", {
                description: error instanceof Error ? error.message : "File not found.",
                id: loadingToast,
            });
        }
    };

    const handleBulkCertificateDownload = async () => {
        if (rows.length === 0) {
            toast.error("No records to download", { description: "Search calibration history first." });
            return;
        }
        if (rows.length > 200) {
            await alert({
                title: "Bulk Download Limit",
                description: "Bulk download is limited to 200 rows at a time. Please reduce the table rows to 200 or fewer and try again.",
                variant: "warning",
            });
            return;
        }

        const confirmed = await confirm({
            title: "Bulk Certificate Download",
            description: `Do you want to download ${rows.length} certificates?`,
            confirmText: "Download",
        });
        if (!confirmed) return;

        const loadingToast = toast.loading("Bulk certificate download preparing...");
        setBulkDownloading(true);
        try {
            const fileName = await downloadWithProgress({
                path: "/api/equipment/cert-download/bulk",
                title: "Bulk Certificate Download",
                fallbackFilename: "CALLAB_report_bulk.zip",
                init: {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "report",
                        items: rows.map((item) => ({ ISID: item.ISID, CIDU: item.CIDU })),
                    }),
                },
            });
            toast.success("Bulk Certificate Download", { description: fileName, id: loadingToast });
        } catch (error) {
            toast.error("Bulk certificate download failed", {
                description: error instanceof Error ? error.message : "Download failed.",
                id: loadingToast,
            });
        } finally {
            setBulkDownloading(false);
        }
    };

    const getPageRange = () => {
        const total = pagination.totalPages;
        const current = pagination.page;
        const maxVisible = 5;
        if (total <= maxVisible) return Array.from({ length: total }, (_, index) => index + 1);
        let start = Math.max(1, current - Math.floor(maxVisible / 2));
        let end = start + maxVisible - 1;
        if (end > total) {
            end = total;
            start = Math.max(1, end - maxVisible + 1);
        }
        return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {MessageDialog}
            <DownloadProgressBar progress={progress} />

            <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-0">
                    <form onSubmit={handleSearch}>
                        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                            <CardTitle className="type-card-title flex items-center text-slate-700">
                                <Search className="w-3.5 h-3.5 mr-2 text-[#001489]" />
                                Calibration History Search
                            </CardTitle>
                            <Button type="submit" className="h-8 px-5 rounded-md bg-[#001489] hover:bg-[#001489]/90 text-white type-label shadow-sm">
                                <Search className="w-3.5 h-3.5 mr-1.5" />
                                SEARCH
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[220px_1fr]">
                            <div className="space-y-1.5">
                                <label className="type-label text-slate-500 ml-1">Search Type</label>
                                <select
                                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 type-control-sm text-slate-900 shadow-sm"
                                    value={searchType}
                                    onChange={(event) => setSearchType(event.target.value as SearchType)}
                                >
                                    <option value="regNo">HCT Reg No</option>
                                    <option value="assetNo">Asset No</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="type-label text-slate-500 ml-1">Keyword</label>
                                <Input
                                    placeholder={searchType === "regNo" ? "Enter HCT registration number" : "Enter asset number"}
                                    className="h-9 rounded-md border-slate-200 bg-white type-control-sm text-slate-900"
                                    value={keyword}
                                    onChange={(event) => setKeyword(event.target.value)}
                                />
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <CardHeader className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-50">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 space-y-3">
                            <CardTitle className="type-panel-title text-slate-500 flex items-center">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mr-3 shadow-inner">
                                    <History className="w-4 h-4 text-[#001489]" />
                                </div>
                                Calibration History
                                {isRefreshing && (
                                    <div className="ml-4 flex items-center text-[#001489]">
                                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                        <span className="type-caption tracking-[0.2em] opacity-60">SYNCING...</span>
                                    </div>
                                )}
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-lg bg-slate-50 px-3 py-1 type-label-sm text-slate-500">Total {pagination.total}</span>
                                <span className="rounded-lg bg-slate-50 px-3 py-1 type-label-sm text-slate-500">Showing {visibleStart}-{visibleEnd}</span>
                                <span className="rounded-lg bg-slate-50 px-3 py-1 type-label-sm text-slate-500">Sort {sortLabel}</span>
                                <span className="rounded-lg bg-blue-50 px-3 py-1 type-label-sm text-[#001489]">Downloads apply to current page</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {activeFilters.length > 0 ? (
                                    activeFilters.map((filter) => (
                                        <span key={filter as string} className="rounded-lg border border-slate-100 bg-white px-3 py-1 type-label-sm text-slate-500 shadow-sm">
                                            {filter}
                                        </span>
                                    ))
                                ) : (
                                    <span className="type-label-sm text-slate-300">Search by HCT No or Asset No</span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
                            <DownloadTooltip text="Downloads the Excel file for the items currently visible on this page.">
                                <Button variant="outline" size="xs" className="h-8 px-3 rounded-lg border-slate-200 bg-white type-caption text-slate-700 hover:bg-slate-50 shadow-sm w-full sm:w-auto" onClick={handleExcelExport}>
                                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                                    Excel Export
                                </Button>
                            </DownloadTooltip>
                            <DownloadTooltip text="Downloads the certificates for the items currently visible on this page.">
                                <Button size="xs" className="h-8 px-3 rounded-lg bg-[#001489] hover:bg-[#001489]/90 type-caption shadow-sm w-full sm:w-auto" disabled={bulkDownloading || rows.length === 0} onClick={handleBulkCertificateDownload}>
                                    {bulkDownloading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                                    Bulk Cert Download
                                </Button>
                            </DownloadTooltip>
                            <select
                                className="h-9 rounded-lg border border-slate-100 bg-slate-50/50 px-3 type-label-sm text-slate-600 shadow-sm"
                                value={pagination.limit}
                                onChange={(event) => handleLimitChange(parseInt(event.target.value, 10))}
                            >
                                <option value="25">SHOW: 25</option>
                                <option value="50">SHOW: 50</option>
                                <option value="100">SHOW: 100</option>
                                <option value="9999">SHOW: ALL</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto custom-scrollbar">
                        <Table className="min-w-[1100px] md:min-w-full">
                            <TableHeader className="bg-slate-50/30 border-b border-slate-100">
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableHead className="w-16 text-center type-table-head py-4 text-slate-400">ID</TableHead>
                                    <TableHead className="w-20 text-center type-table-head py-4 text-slate-400">Cert</TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-5">{renderSortHeader("Cal No", "calNo")}</TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-5">{renderSortHeader("HCT No", "hctNo")}</TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-5">{renderSortHeader("Asset No", "assetNo")}</TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-5">{renderSortHeader("Equipment Name", "equipmentName")}</TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-5">{renderSortHeader("Model/Manu", "modelName")}</TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-5">{renderSortHeader("Serial ID", "serialNumber")}</TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-5">{renderSortHeader("Cal Date", "calDate")}</TableHead>
                                    <TableHead className="type-table-head py-4 text-slate-900 px-5">{renderSortHeader("Return Date", "returnDate")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                <div className="w-10 h-10 border-4 border-slate-50 border-t-[#001489] rounded-full animate-spin" />
                                                <p className="type-card-title text-slate-400">Loading calibration history...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : rows.length > 0 ? (
                                    rows.map((row, index) => (
                                        <TableRow key={`${row.ISID}-${row.CIDU}`} className="border-b border-slate-50/50 hover:bg-slate-50/50 transition-all">
                                            <TableCell className="text-center type-nav-item text-slate-300 py-2.5">{((pagination.page - 1) * pagination.limit + index + 1).toString().padStart(2, "0")}</TableCell>
                                            <TableCell className="py-2.5 text-center">
                                                <Search className="w-4.5 h-4.5 text-slate-400 cursor-pointer hover:text-[#001489] inline-block" onClick={() => handleCertificateDownload(row)} />
                                            </TableCell>
                                            <TableCell className="py-2.5 px-5 type-table-body-strong text-[#001489]">{row.CIDU || "---"}</TableCell>
                                            <TableCell className="py-2.5 px-5 type-table-body-strong text-slate-900">{row.ISID || "---"}</TableCell>
                                            <TableCell className="py-2.5 px-5 type-table-body-strong text-slate-700">{row.ACCN || "---"}</TableCell>
                                            <TableCell className="py-2.5 px-5"><p className="type-table-body-strong text-slate-900 uppercase tracking-tight line-clamp-1 max-w-[240px]">{row.NAEM_SUP || "---"}</p></TableCell>
                                            <TableCell className="py-2.5 px-5">
                                                <p className="type-table-body text-slate-900 font-mono italic truncate w-32">{row.MODL || "---"}</p>
                                                <p className="type-label text-slate-400 mt-1 truncate w-32">{row.MANUFACTURER_NAME || "Manufacturer N/A"}</p>
                                            </TableCell>
                                            <TableCell className="py-2.5 px-5 font-mono type-table-body-strong text-slate-700">{row.SERN || "---"}</TableCell>
                                            <TableCell className="py-2.5 px-5 font-mono type-table-body text-slate-500">{formatDate(row.CAL_DATE)}</TableCell>
                                            <TableCell className="py-2.5 px-5 font-mono type-table-body text-slate-500">{formatDate(row.RETURN_DATE)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-64 text-center text-slate-300 type-table-head">
                                            {hasSearched ? "No History Found" : "Search by HCT reg no or asset no"}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="px-6 md:px-10 py-6 md:py-8 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/20">
                        <div className="flex flex-col items-center sm:items-start">
                            <span className="type-label-sm text-slate-400 mb-1">History Status</span>
                            <span className="type-table-body-strong text-slate-900 uppercase">TOTAL: {pagination.total}</span>
                        </div>

                        {pagination.totalPages > 1 && pagination.limit < 9999 && (
                            <div className="flex items-center gap-2 md:gap-3">
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
                                            className={`w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl type-action-sm ${pagination.page === pageNum ? "bg-[#001489] text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100"}`}
                                            onClick={() => handlePageChange(pageNum)}
                                        >
                                            {pageNum.toString().padStart(2, "0")}
                                        </Button>
                                    ))}
                                </div>
                                <Button variant="ghost" size="icon" className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl text-slate-400" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>
                                    <ChevronRight className="w-5 h-5" />
                                </Button>
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

function formatDate(dateString: unknown) {
    if (!dateString) return "---";
    const val = dateString.toString().trim();
    if (val === "0" || val === "" || val.length !== 8 || val === "00000000") return "---";

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const year = val.substring(0, 4);
    const monthIdx = parseInt(val.substring(4, 6), 10) - 1;
    const day = val.substring(6, 8);
    if (monthIdx < 0 || monthIdx > 11) return "---";
    return `${months[monthIdx]}-${day}-${year}`;
}

function DownloadTooltip({ children, text }: { children: React.ReactNode; text: string }) {
    return (
        <div className="group relative w-full sm:w-auto">
            {children}
            <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 w-64 -translate-x-1/2 rounded-lg border border-slate-100 bg-slate-950 px-3 py-2 text-center text-[10px] font-bold leading-relaxed text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                {text}
            </div>
        </div>
    );
}
