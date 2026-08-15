$code = @"
using System;
using System.Runtime.InteropServices;

public class WinSqlite {
    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_open", CallingConvention = CallingConvention.Cdecl)]
    public static extern int Open(string filename, out IntPtr db);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_close", CallingConvention = CallingConvention.Cdecl)]
    public static extern int Close(IntPtr db);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_prepare_v2", CallingConvention = CallingConvention.Cdecl)]
    public static extern int Prepare(IntPtr db, string sql, int numBytes, out IntPtr stmt, IntPtr tail);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_step", CallingConvention = CallingConvention.Cdecl)]
    public static extern int Step(IntPtr stmt);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_column_text", CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr ColumnText(IntPtr stmt, int index);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_column_bytes", CallingConvention = CallingConvention.Cdecl)]
    public static extern int ColumnBytes(IntPtr stmt, int index);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_finalize", CallingConvention = CallingConvention.Cdecl)]
    public static extern int Finalize(IntPtr stmt);
}
"@

if (-not ([System.Management.Automation.PSTypeName]"WinSqlite").Type) {
    Add-Type -TypeDefinition $code
}

function Dump-Table($dbFile, $table) {
    $dbPath = "C:\Users\66830\.gemini\antigravity\conversations\$dbFile"
    $db = [IntPtr]::Zero
    $res = [WinSqlite]::Open($dbPath, [ref]$db)
    if ($res -ne 0) {
        Write-Output "Failed to open $dbFile"
        return
    }
    
    Write-Output "=== $dbFile : $table ==="
    $sql = "SELECT idx, CAST(data AS TEXT) FROM [$table];"
    $stmt = [IntPtr]::Zero
    $res = [WinSqlite]::Prepare($db, $sql, -1, [ref]$stmt, [IntPtr]::Zero)
    if ($res -eq 0) {
        while ([WinSqlite]::Step($stmt) -eq 100) {
            $idx = [WinSqlite]::ColumnInt($stmt, 0)
            $ptr = [WinSqlite]::ColumnText($stmt, 1)
            $val = [System.Runtime.InteropServices.Marshal]::PtrToStringAnsi($ptr)
            Write-Output "Idx: $idx, Data: $val"
        }
        [WinSqlite]::Finalize($stmt)
    }
    [WinSqlite]::Close($db)
}

Dump-Table "c65c70e4-1473-4c30-bb91-f17f7cbd18d7.db" "gen_metadata"
Dump-Table "c65c70e4-1473-4c30-bb91-f17f7cbd18d7.db" "executor_metadata"
