import oracledb from "oracledb";

// NJS-045 에러 해결을 위한 정밀 초기화 로직
// Oracle 11g 연결을 위해 Thick 모드가 필수입니다.

const initOracle = () => {
    if (typeof window !== "undefined") return;

    try {
        const isMac = process.platform === "darwin";
        const isWin = process.platform === "win32";

        // 환경 변수에서 경로를 먼저 확인하고, 없으면 플랫폼별 기본값 사용
        let libDir = process.env.ORACLE_LIB_DIR;

        if (!libDir && isMac) {
            // macOS (Apple Silicon) 기본 경로
            libDir = "/opt/oracle/instantclient-basic-macos.arm64-23.3.0.23.09-2";
        }

        if (libDir) {
            console.log(`🔍 [DB INIT]: Initializing Thick mode with libDir: ${libDir}`);
            oracledb.initOracleClient({ libDir });
        } else if (isWin) {
            // Windows에서는 Instant Client가 시스템 PATH에 설정되어 있으면 인자 없이 호출 가능
            console.log("🔍 [DB INIT]: Initializing Thick mode (Windows default - searching PATH)");
            oracledb.initOracleClient();
        } else {
            console.log("🔍 [DB INIT]: Initializing Thin mode (No libDir provided for this platform)");
        }

        console.log("✅ Oracle DB mode successfully initialized.");
    } catch (err: any) {
        if (err.message.includes("NJS-077")) {
            // 이미 초기화됨 - 무시
        } else if (err.message.includes("NJS-045")) {
            console.error("❌ NJS-045: Oracle Client 라이브러리를 찾거나 로드할 수 없습니다.");
            console.error(`   - 현재 플랫폼: ${process.platform}`);
            console.error(`   - 시도된 경로: ${process.env.ORACLE_LIB_DIR || 'System PATH'}`);
            console.error("   - .env 파일에 ORACLE_LIB_DIR 설정을 확인하거나 Instant Client 설치를 확인하세요.");
            throw err;
        } else {
            console.error("Oracle Initialization Error:", err);
            throw err;
        }
    }
};

// 모듈 로드시 즉시 초기화 시도
initOracle();

const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASS,
    // ConnectString이 단순 SID일 경우를 대비해 풀 디스크립터 형태로 구성하거나 구체적인 포멧 사용
    connectString: process.env.ORACLE_CONN_STR?.includes("(")
        ? process.env.ORACLE_CONN_STR
        : `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.20.25.2)(PORT=1521))(CONNECT_DATA=(SID=XE)))`,
};

export async function query<T>(sql: string, params: any = []): Promise<T[]> {
    let connection;

    try {
        if (!sql.trim().toUpperCase().startsWith("SELECT")) {
            throw new Error("AI Privacy Guard: Only SELECT queries are allowed.");
        }

        // [DEBUG] 실행되는 쿼리와 파라미터 출력
        console.log("------------------------------------------");
        console.log("🔍 [SQL]:", sql.replace(/\s+/g, ' '));
        console.log("📦 [PARAMS]:", JSON.stringify(params));

        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        console.log(`✅ [RESULT]: ${result.rows?.length} rows found`);
        console.log("------------------------------------------");

        return result.rows as T[];
    } catch (err: any) {
        console.error("❌ [DB ERROR]:", err.message);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error closing connection:", err);
            }
        }
    }
}
