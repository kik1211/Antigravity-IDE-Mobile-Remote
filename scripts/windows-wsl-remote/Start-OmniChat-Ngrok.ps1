# ======================================================
# START OMNI CHAT - NGROK VERSION
# ======================================================

$ScriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$ConfigFile = Join-Path $ScriptDir "config.json"

if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Please run as Administrator."
    Pause; Exit
}

if (-Not (Test-Path $ConfigFile)) {
    Write-Warning "config.json not found."
    Pause; Exit
}

# Read config
try {
    $Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
    $AntigravityPath = $Config.antigravityPath
    $OmniChatWslPath = $Config.omniChatWslPath
    $OmniChatCommand = $Config.omniChatCommand
    $AgProcessName = [System.IO.Path]::GetFileNameWithoutExtension($AntigravityPath)
} catch {
    Write-Warning "Error reading config.json syntax."
    Pause; Exit
}

Write-Host "======================================================" -ForegroundColor DarkCyan
Write-Host "Preparing network environment..." -ForegroundColor Yellow

# Get Gateway IP for Socat
$WinWslIp = (wsl --exec bash -c "ip -4 route show default | cut -d' ' -f3").Trim()

# Remove old bridge and add new Antigravity bridge
netsh interface portproxy delete v4tov4 listenport=7801 listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=7801 listenaddress=0.0.0.0 connectport=7800 connectaddress=127.0.0.1 | Out-Null
New-NetFirewallRule -DisplayName "OmniChat_Dev_CDP" -Direction Inbound -LocalPort 7801 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null

# 1. START ANTIGRAVITY IN WINDOWS
Write-Host "Opening Antigravity..." -ForegroundColor Green
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $ShortcutPath = Join-Path $env:TEMP "LaunchAg.lnk"
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $AntigravityPath
    $Shortcut.Arguments = "--remote-debugging-port=7800"
    $Shortcut.Save()
    Start-Process "explorer.exe" -ArgumentList $ShortcutPath
    Start-Sleep -Seconds 2
    Remove-Item $ShortcutPath -ErrorAction SilentlyContinue
} catch { Write-Warning "Error opening Antigravity." }

# 2. RUN WSL COMMAND
$WslArgs = "-- bash -ic `"socat TCP-LISTEN:7800,bind=127.0.0.1,reuseaddr,fork TCP:${WinWslIp}:7801 & npx --yes ngrok http https://localhost:4747 > /dev/null 2>&1 & echo 'Waiting for tunnels to initialize...' && sleep 5 && cd '$OmniChatWslPath' && echo 'Starting Omni Chat...' && $OmniChatCommand; exec bash`""
Write-Host "Starting server and tunnel inside WSL..." -ForegroundColor Green
$WslProcess = Start-Process "wsl.exe" -ArgumentList $WslArgs -PassThru

# 3. GET NGROK LINK
Write-Host "Waiting for Ngrok public URL..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

try {
    $NgrokResponse = wsl --exec curl -s http://localhost:4040/api/tunnels
    $NgrokData = $NgrokResponse | ConvertFrom-Json
    $PublicUrl = $NgrokData.tunnels[0].public_url
    
    if ($PublicUrl) {
        Write-Host "======================================================" -ForegroundColor DarkCyan
        Write-Host "ACCESS URL:" -ForegroundColor Green
        Write-Host "   $PublicUrl" -ForegroundColor Black -BackgroundColor White
        Write-Host "======================================================" -ForegroundColor DarkCyan
    } else {
        Write-Warning "PublicURL could not be parsed automatically. Check the WSL terminal."
    }
} catch {
    Write-Warning "Could not fetch the ngrok endpoint."
}

[System.Media.SystemSounds]::Beep.Play()
Write-Host "READY TO QUIT?" -ForegroundColor Cyan
$Finalizar = Read-Host "Press ENTER to terminate all processes and clean up"

# 4. CLEANUP PROTOCOL
Write-Host "Terminating processes and cleaning ports..." -ForegroundColor Cyan
wsl --exec bash -c "pkill -f 'ngrok http https://localhost:4747'; pkill -f 'socat TCP-LISTEN:7800'" 2>$null
if ($WslProcess) { Stop-Process -Id $WslProcess.Id -Force -ErrorAction SilentlyContinue }
Stop-Process -Name $AgProcessName -Force -ErrorAction SilentlyContinue

netsh interface portproxy delete v4tov4 listenport=7801 listenaddress=0.0.0.0 | Out-Null
Remove-NetFirewallRule -DisplayName "OmniChat_Dev_CDP" -ErrorAction SilentlyContinue

Write-Host "Cleanup complete." -ForegroundColor Green
Start-Sleep -Seconds 2