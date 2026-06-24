"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type ApiUser = {
    user_id: string;
    name: string;
    corp_id: string;
    corp_name: string;
    role: "MASTER" | "EMPLOYEE" | "USER" | string;
};

type Session = {
    user: {
        id: string;
        name: string;
        corpId: string;
        corpName: string;
        role: string;
    };
};

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
    data: Session | null;
    status: AuthStatus;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(user: ApiUser): Session {
    return {
        user: {
            id: user.user_id,
            name: user.name,
            corpId: user.corp_id,
            corpName: user.corp_name,
            role: user.role,
        },
    };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<Session | null>(null);
    const [status, setStatus] = useState<AuthStatus>("loading");

    const refresh = async () => {
        try {
            const response = await apiFetch("/api/auth/me");
            if (!response.ok) {
                setData(null);
                setStatus("unauthenticated");
                return;
            }
            const user = await response.json();
            setData(toSession(user));
            setStatus("authenticated");
        } catch {
            setData(null);
            setStatus("unauthenticated");
        }
    };

    const login = async (username: string, password: string) => {
        const response = await apiFetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        if (!response.ok) {
            setData(null);
            setStatus("unauthenticated");
            return false;
        }
        const payload = await response.json();
        setData(toSession(payload.user));
        setStatus("authenticated");
        return true;
    };

    const logout = async () => {
        try {
            await apiFetch("/api/auth/logout", { method: "POST" });
        } finally {
            setData(null);
            setStatus("unauthenticated");
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const value = useMemo(
        () => ({ data, status, login, logout, refresh }),
        [data, status],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
