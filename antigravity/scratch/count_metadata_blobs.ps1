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

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_column_int", CallingConvention = CallingConvention.Cdecl)]
    public static extern int ColumnInt(IntPtr stmt, int index);

    [DllImport("winsqlite3.dll", EntryPoint = "sqlite3_finalize", CallingConvention = CallingConvention.Cdecl)]
    public static extern int Finalize(IntPtr stmt);
}
"@

if (-not ([System.Management.Automation.PSTypeName]"WinSqlite").Type) {
    Add-Type -TypeDefinition $code
}

function Count-Blobs($dbFile) {
    $dbPath = "C:\Users\66830\.gemini\antigravity\conversations\$dbFile"
    $db = [IntPtr]::Zero
    $res = [WinSqlite]::Open($dbPath, [ref]$db)
    if ($res -ne 0) {
        Write-Output "Failed to open $dbFile"
        return
    }
    
    $sql = "SELECT count(*) FROM trajectory_metadata_blob;"
    $stmt = [IntPtr]::Zero
    $res = [WinSqlite]::Prepare($db, $sql, -1, [ref]$stmt, [IntPtr]::Zero)
    if ($res -eq 0) {
        if ([WinSqlite]::Step($stmt) -eq 100) {
            $count = [WinSqlite]::ColumnInt($stmt, 0)
            Write-Output "$dbFile - trajectory_metadata_blob Count: $count"
        }
        [WinSqlite]::Finalize($stmt)
    }
    [WinSqlite]::Close($db)
}

Count-Blobs "46cf95ba-2a42-498a-85fc-90c849dcd2ba.db"
Count-Blobs "c65c70e4-1473-4c30-bb91-f17f7cbd18d7.db"
