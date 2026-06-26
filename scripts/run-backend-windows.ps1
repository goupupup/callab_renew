param(
    [string]$OracleLibDir = "C:\oracle\instantclient_19_20",
    [string]$HostName = "127.0.0.1",
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

if (-not $env:CALLAB_ORACLE_USER -or -not $env:CALLAB_ORACLE_PASSWORD) {
    throw "Set CALLAB_ORACLE_USER and CALLAB_ORACLE_PASSWORD before running this script."
}

$env:CALLAB_ORACLE_LIB_DIR = $OracleLibDir
$env:CALLAB_ORACLE_THICK_MODE = "true"

python -m uvicorn app.main:app --app-dir backend --host $HostName --port $Port
