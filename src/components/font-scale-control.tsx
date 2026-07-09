"use client";

import { useEffect, useState } from "react";
import { Type } from "lucide-react";

const FONT_SCALE_STORAGE_KEY = "callab-font-scale";
const FONT_SCALES = [
    { label: "S", value: 0.95 },
    { label: "M", value: 1 },
    { label: "L", value: 1.15 },
    { label: "XL", value: 1.3 },
];

export function FontScaleControl() {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const savedScale = Number(window.localStorage.getItem(FONT_SCALE_STORAGE_KEY));
        const nextScale = FONT_SCALES.some((item) => item.value === savedScale) ? savedScale : 1;
        applyScale(nextScale);
        setScale(nextScale);
    }, []);

    const updateScale = (nextScale: number) => {
        applyScale(nextScale);
        setScale(nextScale);
        window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, nextScale.toString());
    };

    return (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-2 py-1.5 shadow-sm" title="Adjust font size">
            <Type className="h-4 w-4 text-slate-400" />
            <div className="flex items-center rounded-xl bg-white p-1 shadow-inner">
                {FONT_SCALES.map((item) => {
                    const isActive = scale === item.value;
                    return (
                        <button
                            key={item.label}
                            type="button"
                            onClick={() => updateScale(item.value)}
                            className={`h-7 min-w-8 rounded-lg px-2 type-action-sm transition-all ${
                                isActive
                                    ? "bg-[#001489] text-white shadow-sm"
                                    : "text-slate-400 hover:bg-slate-50 hover:text-[#001489]"
                            }`}
                            aria-pressed={isActive}
                            aria-label={`Set font size to ${item.label}`}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function applyScale(scale: number) {
    document.documentElement.style.setProperty("--font-scale", scale.toString());
}
