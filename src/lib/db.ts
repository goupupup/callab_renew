import oracledb from "oracledb";

// NJS-045 에러 해결을 위한 정밀 초기화 로직
// Oracle 11g 연결을 위해 Thick 모드가 필수입니다.

const initOracle = () => {
    if (typeof window !== "undefined") return;

    try {
        // 1. 이미 초기화되었는지 확인 (NJS-077 방지)
        // 2. 경로 구분자를 정규화하여 전달
        const libDir = "C:/instantclient_19_20";
        console.log(`Checking Oracle Client at: ${libDir}`);

        oracledb.initOracleClient({ libDir });
        console.log("✅ Oracle Thick mode successfully initialized.");
    } catch (err: any) {
        if (err.message.includes("NJS-077")) {
            // 이미 초기화됨 - 무시
        } else if (err.message.includes("NJS-045")) {
            console.error("❌ NJS-045: Oracle Client 라이브러리를 찾거나 로드할 수 없습니다.");
            console.error("   - 경로가 정확한지 확인: C:/instantclient_19_20");
            console.error("   - Node.js(x64)와 Instant Client(x64) 아키텍처가 일치하는지 확인");
            console.error("   - Visual Studio 2017 이상용 재배포 가능 패키지가 설치되어 있는지 확인");
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

export async function query<T>(sql: string, params: oracledb.BindParameters = []): Promise<T[]> {
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
