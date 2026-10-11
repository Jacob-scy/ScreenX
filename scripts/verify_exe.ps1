$projectRoot = Split-Path -Parent $PSScriptRoot
$exePath = Join-Path $projectRoot "build\win-unpacked\ScreenX.exe"
if (-not (Test-Path $exePath)) {
    Write-Error "ScreenX.exe not found at $exePath"
    exit 1
}

Write-Host "Launching $exePath..."
$proc = Start-Process -FilePath $exePath -PassThru
Start-Sleep -Seconds 5

$liveProc = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
if ($null -ne $liveProc) {
    Write-Host "=== Process Verification SUCCESS ==="
    Write-Host "Process Name: $($liveProc.ProcessName)"
    Write-Host "Process Id:   $($liveProc.Id)"
    Write-Host "Responding:   $($liveProc.Responding)"
    Write-Host "Main Module:  $($liveProc.MainModule.FileName)"
    
    # Check related child/worker processes
    $allScreenX = Get-Process -Name "ScreenX" -ErrorAction SilentlyContinue
    Write-Host "Total ScreenX processes running: $($allScreenX.Count)"
    
    # Gracefully close
    Stop-Process -Id $proc.Id -Force
    Write-Host "ScreenX process successfully stopped."
    exit 0
} else {
    Write-Error "ScreenX.exe failed to stay running."
    exit 1
}
