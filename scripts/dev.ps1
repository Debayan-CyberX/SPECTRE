param([int]$ApiPort = 8100, [int]$WebPort = 3000)
$ErrorActionPreference = 'Stop'
$spectreRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $spectreRoot
$spectrePython = Join-Path $spectreRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $spectrePython)) { throw 'Run python -m venv .venv and install backend dependencies first. See README.md.' }
$apiListener = Get-NetTCPConnection -State Listen -LocalPort $ApiPort -ErrorAction SilentlyContinue
if ($apiListener) { throw "Port $ApiPort is in use. Choose -ApiPort with a free port." }
$webListener = Get-NetTCPConnection -State Listen -LocalPort $WebPort -ErrorAction SilentlyContinue
if ($webListener) { throw "Port $WebPort is in use. Choose -WebPort with a free port." }
$env:SPECTRE_ALLOWED_ORIGIN = "http://127.0.0.1:$WebPort"
$env:API_INTERNAL_URL = "http://127.0.0.1:$ApiPort"
$apiProcess = Start-Process -FilePath $spectrePython -ArgumentList @('-m','uvicorn','spectre.main:app','--host','127.0.0.1','--port',"$ApiPort",'--no-access-log') -WorkingDirectory $spectreRoot -PassThru -WindowStyle Hidden
try {
    Write-Host "SPECTRE: http://127.0.0.1:$WebPort"
    Set-Location -LiteralPath (Join-Path $spectreRoot 'frontend')
    npm run dev -- --port $WebPort
} finally {
    if (-not $apiProcess.HasExited) { Stop-Process -Id $apiProcess.Id }
    Set-Location -LiteralPath $spectreRoot
}
