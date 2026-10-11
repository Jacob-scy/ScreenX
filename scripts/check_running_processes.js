const { execSync } = require('child_process');

try {
  const psCmd = `Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like 'D:\\ClaudeCodePj\\Screenshot*' } | Select-Object ProcessId, Name, ExecutablePath | Format-List`;
  const out = execSync(`powershell -NoProfile -Command "${psCmd}"`, { encoding: 'utf8' }).trim();
  if (out) {
    console.log('Running processes under D:\\ClaudeCodePj\\Screenshot:');
    console.log(out);
  } else {
    console.log('NO PROCESSES running under D:\\ClaudeCodePj\\Screenshot.');
  }
} catch (err) {
  console.error('Failed to query processes:', err.message);
}
