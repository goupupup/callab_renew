import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { query } from "@/lib/db";

// Authentication Migration (Phase 1) 지침에 따른 NextAuth 설정
// CUSTCAL.TWUSRMAN 테이블을 사용한 레거시 인증 방식 연동

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Calibration Service",
            credentials: {
                username: { label: "Login ID", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;

                try {
                    const loginId = credentials.username.trim();
                    console.log(`[AUTH] Attempting ID: ${loginId}`);

                    // Case-insensitive USERID check with Auth fields
                    const users = await query<any>(
                        `SELECT USERID, PASSWORD, USERNAME, CORPID, CORPNAME, STATE, AUTHORITY, CORPTYPE 
             FROM CUSTCAL.TWUSRMAN 
             WHERE UPPER(USERID) = UPPER(:id)`,
                        { id: loginId }
                    );

                    console.log(`[AUTH] DB Result: ${users.length} users found for ID [${loginId}]`);

                    if (users.length > 0) {
                        // Per User request: Only STATE == '1' accounts can login
                        const activeUser = users.find(u => u.STATE?.trim() === '1');

                        if (!activeUser) {
                            console.warn(`[AUTH] User [${loginId}] found but STATE is [${users[0].STATE}] (not '1')`);
                            return null;
                        }

                        const dbPassword = activeUser.PASSWORD ? activeUser.PASSWORD.trim() : "";
                        const inputPassword = credentials.password.trim();

                        if (dbPassword === inputPassword) {
                            console.log("[AUTH] ✅ Success");

                            // Role Determination Logic
                            let role = "USER";
                            const authority = (activeUser.AUTHORITY || "").trim().toUpperCase();
                            const corpType = (activeUser.CORPTYPE || "").trim().toUpperCase();

                            if (corpType === "H") {
                                if (authority === "A") role = "MASTER";
                                else if (authority === "U") role = "EMPLOYEE";
                            }

                            return {
                                id: activeUser.USERID.trim(),
                                name: activeUser.USERNAME ? activeUser.USERNAME.trim() : "Member",
                                corpId: activeUser.CORPID ? activeUser.CORPID.trim() : "NONE",
                                corpName: activeUser.CORPNAME ? activeUser.CORPNAME.trim() : "HCT",
                                role: role
                            };
                        } else {
                            console.warn("[AUTH] ❌ Password mismatch");
                        }
                    } else {
                        console.warn(`[AUTH] ❌ No user matching ID [${loginId}]`);
                    }
                    return null;
                } catch (error: any) {
                    console.error("[AUTH] 🚨 Exception:", error.message);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.corpId = user.corpId;
                token.corpName = user.corpName;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                (session.user as any).corpId = token.corpId;
                (session.user as any).corpName = token.corpName;
                (session.user as any).role = token.role;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt",
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
