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

                    // Case-insensitive USERID check and log result count even if STATE mismatch
                    const users = await query<any>(
                        `SELECT USERID, PASSWORD, USERNAME, CORPID, CORPNAME, STATE 
             FROM CUSTCAL.TWUSRMAN 
             WHERE UPPER(USERID) = UPPER(:id)`,
                        { id: loginId }
                    );

                    console.log(`[AUTH] DB Result: ${users.length} users found for ID [${loginId}]`);

                    if (users.length > 0) {
                        // Find active user first
                        const activeUser = users.find(u => u.STATE?.trim() === '1');

                        if (!activeUser) {
                            console.warn(`[AUTH] User [${loginId}] found but STATE is [${users[0].STATE}] (not '1')`);
                            return null;
                        }

                        const dbPassword = activeUser.PASSWORD ? activeUser.PASSWORD.trim() : "";
                        const inputPassword = credentials.password.trim();

                        console.log(`[AUTH] Password Check - DB Len: ${dbPassword.length}, Input Len: ${inputPassword.length}`);

                        if (dbPassword === inputPassword) {
                            console.log("[AUTH] ✅ Success");
                            return {
                                id: activeUser.USERID.trim(),
                                name: activeUser.USERNAME ? activeUser.USERNAME.trim() : "Member",
                                corpId: activeUser.CORPID ? activeUser.CORPID.trim() : "NONE",
                                corpName: activeUser.CORPNAME ? activeUser.CORPNAME.trim() : "HCT",
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
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.corpId = token.corpId;
                session.user.corpName = token.corpName;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
