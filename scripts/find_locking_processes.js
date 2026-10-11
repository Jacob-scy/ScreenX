const { execSync } = require('child_process');

try {
  const psScript = `
    Get-CimInstance Win32_Process | ForEach-Object {
      $cmd = $_.CommandLine
      $id = $_.ProcessId
      $name = $_.Name
      if ($cmd -and $cmd.IndexOf("Screenshot", [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
        Write-Output "PID: $id | NAME: $name | CMD: $cmd"
      }
    }
  `;
  const out = execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, { encoding: 'utf8' }).trim();
  console.log(out || 'No process found with Screenshot in CommandLine.');
} catch (e) {
  console.error(e.message);
}
