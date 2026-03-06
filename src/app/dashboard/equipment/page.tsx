"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
    Search, FileText, Download, Trash2, Eye,
    Printer, FileSpreadsheet, ChevronLeft, ChevronRight,
    Loader2, Package, ShieldCheck
} from "lucide-react";
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
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const filterParam = searchParams.get("filter");

    const [sortConfig, setSortConfig] = useState({
        key: "regDate",
        direction: "desc"
    });

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === "0" || dateString.length !== 8) return "---";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const year = dateString.substring(0, 4);
        const monthNum = parseInt(dateString.substring(4, 6)) - 1;
        const day = dateString.substring(6, 8);
        return `${months[monthNum]}-${day}-${year}`;
    };

    const [equipment, setEquipment] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 1
    });

    const [isRefreshing, setIsRefreshing] = useState(false);
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

    const isMaster = (session?.user as any)?.role === "MASTER";

    const fetchEquipment = useCallback(async (page = 1, limit = pagination.limit, sort = sortConfig, currentFilters = filters) => {
        // Only set the major loading state if we have no data yet
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

            const response = await fetch(`/api/equipment?${queryParams.toString()}`);
            if (response.ok) {
                const result = await response.json();
                setEquipment(result.data);
                setPagination(result.pagination);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Data Sync Failed", { description: "Using existing local data." });
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

    const handleFileDownload = async (id: string, type: "data" | "report") => {
        const loadingToast = toast.loading("Connecting to secure server...");
        try {
            const response = await fetch(`/api/equipment/download?id=${encodeURIComponent(id)}&type=${type}`);

            if (response.ok) {
                const contentType = response.headers.get('Content-Type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    toast.error("System Error", { description: errorData.error, id: loadingToast });
                    return;
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;

                // Robust filename extraction supporting RFC 5987 and standard formats
                const contentDisposition = response.headers.get('Content-Disposition');
                let fileName = `${id}_${type}.${type === 'report' ? 'pdf' : 'zip'}`;

                if (contentDisposition) {
                    const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
                    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);

                    if (filenameStarMatch) {
                        fileName = decodeURIComponent(filenameStarMatch[1]);
                    } else if (filenameMatch) {
                        try {
                            const raw = filenameMatch[1];
                            fileName = raw.includes('%') ? decodeURIComponent(raw) : raw;
                        } catch {
                            fileName = filenameMatch[1];
                        }
                    }
                }

                a.download = fileName;
                document.body.appendChild(a);
                a.click();

                toast.success("Download Initialized", { description: fileName, id: loadingToast });

                // Cleanup with safer delay
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                }, 1000);
            } else {
                let errorMsg = "An error occurred during file retrieval.";
                try {
                    const errorRes = await response.json();
                    errorMsg = errorRes.error || errorMsg;
                } catch { /* backup */ }

                if (response.status === 404) {
                    toast.error("File Not Found", { description: "Asset documentation is not available on server.", id: loadingToast });
                } else {
                    toast.error("System Alert", { description: errorMsg, id: loadingToast });
                }
            }
        } catch (error) {
            console.error("Download failure:", error);
            toast.error("Terminal Error", { description: "Connection lost. Please check your network.", id: loadingToast });
        }
    };
    const handleExcelExport = () => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value.toString());
        });
        params.append("sortBy", sortConfig.key);
        params.append("order", sortConfig.direction);
        params.append("page", pagination.page.toString());
        params.append("limit", pagination.limit.toString());

        window.location.href = `/api/equipment/export?${params.toString()}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Search Filters Card - Reverted to Original Premium Style */}
            <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden mt-0">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-6 text-slate-500">
                    <CardTitle className="text-[11px] font-black uppercase tracking-[0.4em] flex items-center">
                        <Search className="w-3.5 h-3.5 mr-3 text-[#001489]" />
                        Asset Search & Filter System
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="grid grid-cols-1 gap-y-4">
                            {/* Row 1: Company (Master Only) */}
                            {isMaster && (
                                <div className="flex items-center space-x-6">
                                    <label className="w-32 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Company</label>
                                    <Input
                                        placeholder="Enter Company Name..."
                                        className="h-10 rounded-xl border-slate-200 bg-white focus:border-[#001489] transition-all font-bold text-slate-900 text-sm flex-1 max-w-2xl"
                                        value={filters.company}
                                        onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                                    />
                                </div>
                            )}

                            {/* Row 2: Serial Number, Asset No, Registration No */}
                            <div className="flex items-center space-x-8">
                                <div className="flex items-center space-x-4 flex-1">
                                    <label className="w-32 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Serial Number</label>
                                    <Input
                                        placeholder="Serial..."
                                        className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-sm w-full"
                                        value={filters.serialNumber}
                                        onChange={(e) => setFilters({ ...filters, serialNumber: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center space-x-4 flex-1">
                                    <label className="w-32 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Asset No</label>
                                    <Input
                                        placeholder="Asset..."
                                        className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-sm w-full"
                                        value={filters.assetNo}
                                        onChange={(e) => setFilters({ ...filters, assetNo: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center space-x-4 flex-1">
                                    <label className="w-32 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 whitespace-nowrap">Registration No</label>
                                    <Input
                                        placeholder="Reg..."
                                        className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-sm w-full"
                                        value={filters.regNo}
                                        onChange={(e) => setFilters({ ...filters, regNo: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Row 3: Model Name, Equipment Name, Manufacturer */}
                            <div className="flex items-center space-x-8">
                                <div className="flex items-center space-x-4 flex-1">
                                    <label className="w-32 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Model Name</label>
                                    <Input
                                        placeholder="Model..."
                                        className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-sm w-full"
                                        value={filters.modelName}
                                        onChange={(e) => setFilters({ ...filters, modelName: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center space-x-4 flex-1">
                                    <label className="w-32 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Equipment Name</label>
                                    <Input
                                        placeholder="Name..."
                                        className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-sm w-full"
                                        value={filters.equipmentName}
                                        onChange={(e) => setFilters({ ...filters, equipmentName: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center space-x-4 flex-1">
                                    <label className="w-32 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Manufacturer</label>
                                    <Input
                                        placeholder="Mnfr..."
                                        className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-sm w-full"
                                        value={filters.manufacturer}
                                        onChange={(e) => setFilters({ ...filters, manufacturer: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Row 4: Last Calibration, Next Calibration, Search Button */}
                            <div className="flex items-center space-x-8 border-t border-slate-100 pt-4 mt-2">
                                <div className="flex items-center space-x-4 flex-1">
                                    <label className="w-32 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 whitespace-nowrap">Last Calibration</label>
                                    <div className="flex items-center space-x-2 w-full">
                                        <Input type="date" className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs flex-1" value={filters.lastCalStart} onChange={(e) => setFilters({ ...filters, lastCalStart: e.target.value })} />
                                        <span className="text-slate-300">~</span>
                                        <Input type="date" className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs flex-1" value={filters.lastCalEnd} onChange={(e) => setFilters({ ...filters, lastCalEnd: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4 flex-1">
                                    <label className="w-32 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 whitespace-nowrap">Next Calibration</label>
                                    <div className="flex items-center space-x-2 w-full">
                                        <Input type="date" className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs flex-1" value={filters.nextCalStart} onChange={(e) => setFilters({ ...filters, nextCalStart: e.target.value })} />
                                        <span className="text-slate-300">~</span>
                                        <Input type="date" className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs flex-1" value={filters.nextCalEnd} onChange={(e) => setFilters({ ...filters, nextCalEnd: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-end flex-1">
                                    <Button type="submit" className="h-10 px-10 bg-[#001489] hover:bg-[#001489]/90 text-white rounded-xl shadow-lg shadow-blue-900/10 font-black uppercase tracking-widest text-xs">
                                        <Search className="w-4 h-4 mr-2" />
                                        SEARCH
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
            {/* Equipment Data Table - Redesigned for Premium Readability */}
            <Card className="border-none shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden bg-white mt-4">
                <CardHeader className="px-10 py-8 flex flex-row items-center justify-between border-b border-slate-50">
                    <CardTitle className="text-[12px] font-black uppercase tracking-[0.6em] text-slate-400 flex items-center">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mr-5 shadow-inner">
                            <FileText className="w-5 h-5 text-orange-600" />
                        </div>
                        Secure Asset Registry
                        {isRefreshing && (
                            <div className="ml-8 flex items-center text-[#001489]">
                                <Loader2 className="w-3.5 h-3.5 mr-3 animate-spin" />
                                <span className="tracking-[0.3em] text-[9px] font-black opacity-60">REFRESHING TELEMETRY...</span>
                            </div>
                        )}
                    </CardTitle>
                    <div className="flex items-center space-x-10">
                        <div className="flex items-center space-x-8">
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        className="peer w-5 h-5 rounded-lg border-2 border-slate-200 text-[#001489] focus:ring-0 cursor-pointer appearance-none checked:bg-[#001489] checked:border-[#001489] transition-all"
                                        checked={filters.onGoingOnly}
                                        onChange={(e) => {
                                            const newFilters = { ...filters, onGoingOnly: e.target.checked };
                                            setFilters(newFilters);
                                            fetchEquipment(1, pagination.limit, sortConfig, newFilters);
                                        }}
                                    />
                                    <ShieldCheck className="absolute w-3 h-3 text-white left-1 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#001489] transition-colors">On-Going</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        className="peer w-5 h-5 rounded-lg border-2 border-slate-200 text-rose-600 focus:ring-0 cursor-pointer appearance-none checked:bg-rose-600 checked:border-rose-600 transition-all"
                                        checked={filters.expirationOnly}
                                        onChange={(e) => {
                                            const newFilters = { ...filters, expirationOnly: e.target.checked };
                                            setFilters(newFilters);
                                            fetchEquipment(1, pagination.limit, sortConfig, newFilters);
                                        }}
                                    />
                                    <Trash2 className="absolute w-3 h-3 text-white left-1 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-rose-600 transition-colors">Expiring</span>
                            </label>
                        </div>
                        <select
                            className="h-10 rounded-xl border border-slate-100 bg-slate-50/50 px-4 text-[10px] font-black text-slate-600 focus:outline-none focus:bg-white focus:border-slate-200 transition-all cursor-pointer shadow-sm"
                            value={pagination.limit}
                            onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                        >
                            <option value="25">ROWS: 25</option>
                            <option value="50">ROWS: 50</option>
                            <option value="100">ROWS: 100</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/30 border-b border-slate-100">
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableHead className="w-16 text-center text-[12px] font-black py-6 text-slate-400 uppercase tracking-widest">ID</TableHead>
                                    <TableHead className="w-24 text-center text-[12px] font-black py-6 text-slate-400 uppercase tracking-widest">DATA</TableHead>
                                    <TableHead className="w-24 text-center text-[12px] font-black py-6 text-slate-400 uppercase tracking-widest">Reports</TableHead>
                                    <TableHead className="text-[12px] font-black py-6 text-slate-900 uppercase tracking-widest px-6 cursor-pointer group transition-colors" onClick={() => handleSort("assetNo")}>
                                        <div className="flex items-center space-x-2 group-hover:text-[#001489]">
                                            <span>Asset #</span>
                                            {sortConfig.key === "assetNo" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-[12px] font-black py-6 text-slate-900 uppercase tracking-widest px-6 cursor-pointer group transition-colors" onClick={() => handleSort("hctNo")}>
                                        <div className="flex items-center space-x-2 group-hover:text-[#001489]">
                                            <span>HCT REF</span>
                                            {sortConfig.key === "hctNo" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-[12px] font-black py-6 text-slate-900 uppercase tracking-widest px-6 cursor-pointer group transition-colors" onClick={() => handleSort("equipmentName")}>
                                        <div className="flex items-center space-x-2 group-hover:text-[#001489]">
                                            <span>Equipment Name</span>
                                            {sortConfig.key === "equipmentName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-[12px] font-black py-6 text-slate-400 uppercase tracking-widest px-6">Model/Manu</TableHead>
                                    <TableHead className="text-[12px] font-black py-6 text-slate-400 uppercase tracking-widest px-6">Serial ID</TableHead>
                                    <TableHead className="text-[12px] font-black py-6 text-slate-900 uppercase tracking-widest px-6 cursor-pointer group transition-colors text-right" onClick={() => handleSort("nextCal")}>
                                        <div className="flex items-center justify-end space-x-2 group-hover:text-[#001489]">
                                            <span>Next Cycle</span>
                                            {sortConfig.key === "nextCal" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-5">
                                                <div className="relative">
                                                    <div className="w-12 h-12 rounded-2xl border-4 border-slate-50 border-t-[#001489] animate-spin" />
                                                    <Package className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-slate-200" />
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 animate-pulse">Syncing Cryptographic Data...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : equipment.length > 0 ? (
                                    equipment.map((item, index) => {
                                        const isExpired = item.NEXT && new Date(item.NEXT.substring(0, 4) + '-' + item.NEXT.substring(4, 6) + '-' + item.NEXT.substring(6, 8)) < new Date();
                                        return (
                                            <TableRow key={item.ISID} className="border-b border-slate-50/50 hover:bg-slate-50/50 transition-all group/row">
                                                <TableCell className="text-center text-[10px] font-black text-slate-300 py-4 group-hover/row:text-[#001489] transition-colors">
                                                    {((pagination.page - 1) * pagination.limit + index + 1).toString().padStart(2, '0')}
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <div className="flex items-center justify-center">
                                                        <Eye className="w-4 h-4 text-slate-400 cursor-pointer hover:text-[#001489] transition-colors" onClick={() => handleFileDownload(item.ISID, "data")} />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <div className="flex items-center justify-center">
                                                        <Search className="w-4 h-4 text-slate-400 cursor-pointer hover:text-[#001489] transition-colors" onClick={() => handleFileDownload(item.ISID, "report")} />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 px-6 font-black text-slate-900 text-xs tracking-tight">{item.ACCN || "---"}</TableCell>
                                                <TableCell className="py-4 px-6 font-black text-[#001489] text-[11px] tracking-widest">{item.ISID}</TableCell>
                                                <TableCell className="py-4 px-6 pr-10">
                                                    <p className="font-black text-slate-900 text-[11px] uppercase tracking-tight leading-tight max-w-[300px] line-clamp-1">{item.NAEM_SUP}</p>
                                                </TableCell>
                                                <TableCell className="py-4 px-6">
                                                    <p className="font-bold text-slate-900 font-mono italic text-[11px]">{item.MODL}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest truncate max-w-[150px]" title={item.MANUFACTURER_NAME}>
                                                        {item.MANUFACTURER_NAME || "Manufacturer N/A"}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="py-4 px-6 font-mono text-[11px] font-black text-slate-700">{item.SERN}</TableCell>
                                                <TableCell className={`py-4 px-6 text-right`}>
                                                    <div className={`inline-flex items-center px-4 py-1.5 rounded-xl font-black text-[10px] tracking-tight ${isExpired
                                                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                        }`}>
                                                        {formatDate(item.NEXT)}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-6">
                                                <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center">
                                                    <Package className="w-10 h-10 text-slate-200" />
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">No telemetry records found for this sector</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Footer Actions & Pagination */}
                    <div className="px-10 py-8 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/20">
                        <div className="flex items-center space-x-6">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Database Index</span>
                                <span className="text-sm font-black text-slate-900 tracking-tight">TOTAL ASSETS: {pagination.total}</span>
                            </div>
                            <Button
                                variant="outline"
                                className="h-10 px-6 rounded-xl border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                                onClick={handleExcelExport}
                            >
                                <FileSpreadsheet className="w-4 h-4 mr-2.5 text-emerald-600" />
                                DATA EXPORT
                            </Button>
                        </div>

                        {pagination.limit < 9999 && (
                            <div className="flex items-center space-x-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-10 h-10 rounded-xl text-slate-400 hover:bg-white hover:shadow-md transition-all"
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                                <div className="flex items-center space-x-2">
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        const pageNum = i + 1;
                                        return (
                                            <Button
                                                key={pageNum}
                                                className={`w-10 h-10 rounded-xl font-black text-[11px] transition-all ${pagination.page === pageNum
                                                    ? 'bg-[#001489] text-white shadow-lg shadow-blue-900/20'
                                                    : 'bg-white text-slate-400 hover:text-[#001489] hover:shadow-md'
                                                    }`}
                                                onClick={() => handlePageChange(pageNum)}
                                            >
                                                {pageNum.toString().padStart(2, '0')}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-10 h-10 rounded-xl text-slate-400 hover:bg-white hover:shadow-md transition-all"
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
