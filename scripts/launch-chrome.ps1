$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path -LiteralPath $chrome)) {
  $chrome = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
}
if (-not (Test-Path -LiteralPath $chrome)) {
  throw "Chrome not found. Install Chrome or edit this script with its path."
}

$profile = Join-Path $env:LOCALAPPDATA "XhsJobHunter\chrome-profile"
New-Item -ItemType Directory -Force -Path $profile | Out-Null

Start-Process -FilePath $chrome -ArgumentList @(
  "--remote-debugging-port=9222",
  "--remote-debugging-address=127.0.0.1",
  "--user-data-dir=$profile",
  "https://www.xiaohongshu.com"
)

Write-Host "Chrome started with CDP on http://127.0.0.1:9222"
Write-Host "Log in to Xiaohongshu manually in that window, then run the plugin."
