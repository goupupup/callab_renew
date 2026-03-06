"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
    const { data: session } = useSession();
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
        onGoingOnly: false,
        expirationOnly: false
    });

    const isMaster = (session?.user as any)?.role === "MASTER";

    const fetchEquipment = async (page = 1, limit = pagination.limit, sort = sortConfig, currentFilters = filters) => {
        setIsLoading(true);
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
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session) fetchEquipment();
    }, [session]);

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
        try {
            const response = await fetch(`/api/equipment/download?id=${encodeURIComponent(id)}&type=${type}`);

            if (response.ok) {
                // If the response is successful, trigger actual browser download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                // Extract filename from Content-Disposition if possible, otherwise default
                const contentDisposition = response.headers.get('Content-Disposition');
                let fileName = `${id}_${type}.pdf`;
                if (contentDisposition && contentDisposition.includes('filename=')) {
                    fileName = contentDisposition.split('filename=')[1].replace(/"/g, '');
                }

                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                const errorData = await response.json();
                if (response.status === 404) {
                    alert("No files available for download.");
                } else {
                    alert(errorData.error || "An error occurred during file retrieval.");
                }
            }
        } catch (error) {
            console.error("Download failure:", error);
            alert("Server connection failed.");
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
            {/* Equipment Data Table - Premium Style Reverted */}
            <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white border-t-0">
                <CardHeader className="px-6 py-4 border-b border-slate-50 flex flex-row items-center justify-between">
                    <CardTitle className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 flex items-center">
                        <FileText className="w-4 h-4 mr-4 text-[#001489]" />
                        EQUIPMENT LIST
                    </CardTitle>
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-300 text-[#001489] focus:ring-[#001489]"
                                    checked={filters.onGoingOnly}
                                    onChange={(e) => {
                                        const newFilters = { ...filters, onGoingOnly: e.target.checked };
                                        setFilters(newFilters);
                                        fetchEquipment(1, pagination.limit, sortConfig, newFilters);
                                    }}
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-[#001489] transition-colors">On-Going Only</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-600"
                                    checked={filters.expirationOnly}
                                    onChange={(e) => {
                                        const newFilters = { ...filters, expirationOnly: e.target.checked };
                                        setFilters(newFilters);
                                        fetchEquipment(1, pagination.limit, sortConfig, newFilters);
                                    }}
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-rose-600 transition-colors">Expiration Only</span>
                            </label>
                        </div>
                        <select
                            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-700 focus:outline-none"
                            value={pagination.limit}
                            onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                        >
                            <option value="25">25 per page</option>
                            <option value="50">50 per page</option>
                            <option value="100">100 per page</option>
                            <option value="9999">All</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/80 backdrop-blur-sm">
                                <TableRow className="border-slate-100 hover:bg-transparent">
                                    <TableHead className="w-12 text-center text-[10px] font-black py-4 text-slate-500 uppercase tracking-widest">No</TableHead>
                                    <TableHead className="w-24 text-center text-[10px] font-black py-4 text-slate-500 uppercase tracking-widest">Data File</TableHead>
                                    <TableHead className="w-20 text-center text-[10px] font-black py-4 text-slate-500 uppercase tracking-widest">Report</TableHead>
                                    <TableHead className="text-[10px] font-black py-4 text-slate-500 uppercase tracking-widest px-4 cursor-pointer hover:text-[#001489]" onClick={() => handleSort("assetNo")}>Asset No {sortConfig.key === "assetNo" && (sortConfig.direction === "asc" ? "↑" : "↓")}</TableHead>
                                    <TableHead className="text-[10px] font-black py-4 text-slate-500 uppercase tracking-widest px-4 cursor-pointer hover:text-[#001489]" onClick={() => handleSort("hctNo")}>HCT No {sortConfig.key === "hctNo" && (sortConfig.direction === "asc" ? "↑" : "↓")}</TableHead>
                                    <TableHead className="text-[10px] font-black py-4 text-slate-500 uppercase tracking-widest px-4 cursor-pointer hover:text-[#001489]" onClick={() => handleSort("equipmentName")}>Equipment Name {sortConfig.key === "equipmentName" && (sortConfig.direction === "asc" ? "↑" : "↓")}</TableHead>
                                    <TableHead className="text-[10px] font-black py-4 text-slate-500 uppercase tracking-widest px-4 cursor-pointer hover:text-[#001489]" onClick={() => handleSort("modelName")}>Model Name {sortConfig.key === "modelName" && (sortConfig.direction === "asc" ? "↑" : "↓")}</TableHead>
                                    <TableHead className="text-[10px] font-black py-4 text-slate-500 uppercase tracking-widest px-4 cursor-pointer hover:text-[#001489]" onClick={() => handleSort("serialNumber")}>Serial Number {sortConfig.key === "serialNumber" && (sortConfig.direction === "asc" ? "↑" : "↓")}</TableHead>
                                    <TableHead className="text-[10px] font-black py-4 text-slate-500 uppercase tracking-widest px-4 cursor-pointer hover:text-[#001489]" onClick={() => handleSort("nextCal")}>Next Cal {sortConfig.key === "nextCal" && (sortConfig.direction === "asc" ? "↑" : "↓")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-48 text-center text-slate-900">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <Loader2 className="w-6 h-6 text-[#001489] animate-spin opacity-40" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700">Synchronizing Live Data...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : equipment.length > 0 ? (
                                    equipment.map((item, index) => (
                                        <TableRow key={item.ISID} className="border-slate-50 hover:bg-slate-50/70 transition-all group">
                                            <TableCell className="text-center text-xs font-black text-slate-900 py-2.5">
                                                {(pagination.page - 1) * pagination.limit + index + 1}
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <div className="flex items-center justify-center space-x-2.5 text-slate-400">
                                                    <Eye className="w-4 h-4 cursor-pointer hover:text-[#001489] transition-colors" onClick={() => handleFileDownload(item.ISID, "data")} />
                                                    {isMaster && (
                                                        <>
                                                            <Download className="w-4 h-4 cursor-pointer hover:text-[#001489] transition-colors" onClick={() => handleFileDownload(item.ISID, "data")} />
                                                            <Trash2 className="w-4 h-4 cursor-pointer hover:text-rose-600 transition-colors" />
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <div className="flex items-center justify-center">
                                                    <Search className="w-4 h-4 text-slate-400 cursor-pointer hover:text-[#001489] transition-colors" onClick={() => handleFileDownload(item.ISID, "report")} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5 px-4 font-black text-slate-900 text-[11px]">{item.ACCN || "---"}</TableCell>
                                            <TableCell className="py-2.5 px-4 font-black text-[#001489] text-[11px]">{item.ISID}</TableCell>
                                            <TableCell className="py-2.5 px-4 font-black text-slate-950 text-[11px] uppercase">{item.NAEM_SUP}</TableCell>
                                            <TableCell className="py-2.5 px-4 font-black text-slate-800 font-mono italic text-[11px]">{item.MODL}</TableCell>
                                            <TableCell className="py-2.5 px-4 font-mono text-[11px] font-black text-slate-900">{item.SERN}</TableCell>
                                            <TableCell className={`py-2.5 px-4 text-[11px] font-black tracking-tighter ${new Date(item.NEXT) < new Date() ? 'text-rose-600' : 'text-slate-950'}`}>
                                                {formatDate(item.NEXT)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                <Package className="w-10 h-10 text-slate-100" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">No Asset Records Found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Footer Actions & Pagination */}
                    <div className="px-6 py-4 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/30">
                        <div className="flex items-center space-x-2">
                            <span className="text-[11px] font-black text-slate-400 mr-2 uppercase tracking-widest">
                                TOTAL: <span className="text-slate-900">{pagination.total}</span>
                            </span>
                            <Button
                                variant="outline"
                                className="h-8 px-4 rounded-xl border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-white shadow-sm"
                                onClick={handleExcelExport}
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                EXCEL EXPORT
                            </Button>
                        </div>

                        {pagination.limit < 9999 && (
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8 rounded-lg text-slate-400 hover:bg-white hover:shadow-sm"
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center space-x-1">
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        const pageNum = i + 1;
                                        return (
                                            <Button
                                                key={pageNum}
                                                size="sm"
                                                className={`w-8 h-8 rounded-lg font-black text-[11px] ${pagination.page === pageNum ? 'bg-[#001489] text-white' : 'variant-ghost text-slate-500 hover:bg-white'}`}
                                                onClick={() => handlePageChange(pageNum)}
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8 rounded-lg text-slate-400 hover:bg-white hover:shadow-sm"
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
