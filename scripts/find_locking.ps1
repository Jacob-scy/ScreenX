$procs = Get-CimInstance Win32_Process
foreach ($p in $procs) {
    $cmd = $p.CommandLine
    if ($cmd -and ($cmd -match "Screenshot")) {
        Write-Output "PID: $($p.ProcessId) | Name: $($p.Name) | Cmd: $cmd"
    }
}
