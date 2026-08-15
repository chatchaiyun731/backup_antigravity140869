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

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_column_blob", CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr ColumnBlob(IntPtr stmt, int index);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_column_bytes", CallingConvention = CallingConvention.Cdecl)]
    public static extern int ColumnBytes(IntPtr stmt, int index);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_finalize", CallingConvention = CallingConvention.Cdecl)]
    public static extern int Finalize(IntPtr stmt);
}
"@

if (-not ([System.Management.Automation.PSTypeName]"WinSqlite").Type) {
    Add-Type -TypeDefinition $code
}

function Dump-Blob($dbFile) {
    $dbPath = "C:\Users\66830\.gemini\antigravity\conversations\$dbFile"
    $db = [IntPtr]::Zero
    $res = [WinSqlite]::Open($dbPath, [ref]$db)
    if ($res -ne 0) {
        Write-Output "Failed to open $dbFile"
        return
    }
    
    $sql = "SELECT data FROM trajectory_metadata_blob WHERE id='main';"
    $stmt = [IntPtr]::Zero
    $res = [WinSqlite]::Prepare($db, $sql, -1, [ref]$stmt, [IntPtr]::Zero)
    if ($res -eq 0) {
        if ([WinSqlite]::Step($stmt) -eq 100) {
            $ptr = [WinSqlite]::ColumnBlob($stmt, 0)
            $len = [WinSqlite]::ColumnBytes($stmt, 0)
            $bytes = New-Object byte[] $len
            [System.Runtime.InteropServices.Marshal]::Copy($ptr, $bytes, 0, $len)
            
            $str = ""
            foreach ($b in $bytes) {
                if ($b -ge 32 -and $b -le 126) {
                    $str += [char]$b
                } else {
                    $str += "."
                }
            }
            Write-Output $str
        }
        [WinSqlite]::Finalize($stmt)
    }
    [WinSqlite]::Close($db)
}

Dump-Blob "f43ccb5d-807c-497e-8d6d-b3d8563d9ba8.db"
