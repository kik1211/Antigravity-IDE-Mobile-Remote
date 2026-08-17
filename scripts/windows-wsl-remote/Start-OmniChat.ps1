# Get the directory where this script is located
$ScriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$ConfigFile = Join-Path $ScriptDir "config.json"

if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Please run PowerShell as Administrator."
    Pause; Exit
}

if (-Not (Test-Path $ConfigFile)) {
    Write-Warning "config.json not found at: $ConfigFile"
    Pause; Exit
}

# Read settings from JSON
try {
    $Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
    $AntigravityPath = $Config.antigravityPath
    $OmniChatWslPath = $Config.omniChatWslPath
    $OmniChatCommand = $Config.omniChatCommand
    $AgProcessName = [System.IO.Path]::GetFileNameWithoutExtension($AntigravityPath)
} catch {
    Write-Warning "Error reading config.json."
    Pause; Exit
}

Write-Host "======================================================" -ForegroundColor DarkCyan
Write-Host "Mapping network interfaces..." -ForegroundColor Yellow

$WslIp = (wsl --exec hostname -I).Trim().Split(" ")[0]
$WinIp = (Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp | Select-Object -First 1).IPAddress
$WinWslIp = (wsl --exec bash -c "ip -4 route show default | cut -d' ' -f3").Trim()

Write-Host "   -> External to Host (LAN) : $WinIp" -ForegroundColor White
Write-Host "   -> Host to WSL (vLAN)     : $WslIp" -ForegroundColor White
Write-Host "   -> WSL to Host (vLAN)     : $WinWslIp" -ForegroundColor Green

Write-Host "======================================================" -ForegroundColor DarkCyan
Write-Host "Configuring firewall and ports..." -ForegroundColor Yellow

# 1. Mobile Bridge (4747 -> WSL 4747)
netsh interface portproxy add v4tov4 listenport=4747 listenaddress=0.0.0.0 connectport=4747 connectaddress=$WslIp
New-NetFirewallRule -DisplayName "OmniChat_Dev_Mobile" -Direction Inbound -LocalPort 4747 -Protocol TCP -Action Allow -Profile Any | Out-Null

# 2. CDP Bridge (Listen on Windows 7801 -> Forward to localhost 7800 where Antigravity runs)
netsh interface portproxy add v4tov4 listenport=7801 listenaddress=0.0.0.0 connectport=7800 connectaddress=127.0.0.1
New-NetFirewallRule -DisplayName "OmniChat_Dev_CDP" -Direction Inbound -LocalPort 7801 -Protocol TCP -Action Allow -Profile Any | Out-Null

Write-Host "   -> Rules successfully applied."
Write-Host "======================================================" -ForegroundColor DarkCyan

# 3. START ANTIGRAVITY
Write-Host "Starting Antigravity..." -ForegroundColor Green
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
} catch {
    Write-Warning "   Failed to open Antigravity."
}

# 4. START SOCAT + OMNI CHAT (in WSL)
Write-Host "Starting Socat tunnel and Omni Chat inside WSL..." -ForegroundColor Green

$WslArgs = "-- bash -ic `"socat TCP-LISTEN:7800,bind=127.0.0.1,reuseaddr,fork TCP:${WinWslIp}:7801 & cd '$OmniChatWslPath' && $OmniChatCommand; echo -e '\nCommand failed...'; exec bash`""

Write-Host "   -> Running Node server and tunneling..." -ForegroundColor Magenta

$WslProcess = $null
try {
    $WslProcess = Start-Process "wsl.exe" -ArgumentList $WslArgs -PassThru -ErrorAction Stop
} catch {
    Write-Warning "   Failed to open WSL terminal."
}

Write-Host "======================================================" -ForegroundColor DarkCyan
Write-Host "Environment is online." -ForegroundColor Green
# Note: Intentional for local development only
Write-Host "Access via mobile: https://${WinIp}:4747" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor DarkCyan

[System.Media.SystemSounds]::Beep.Play()

Read-Host "Press ENTER to terminate processes and clean up rules"

Write-Host "Cleaning up..." -ForegroundColor Cyan

# Terminate Socat in WSL
wsl --exec bash -c "pkill -f 'socat TCP-LISTEN:7800'" 2>$null

# Close processes
if ($WslProcess -ne $null) { Stop-Process -Id $WslProcess.Id -Force -ErrorAction SilentlyContinue }
Stop-Process -Name $AgProcessName -Force -ErrorAction SilentlyContinue

# Clean Windows rules
netsh interface portproxy delete v4tov4 listenport=4747 listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy delete v4tov4 listenport=7801 listenaddress=0.0.0.0 | Out-Null
Remove-NetFirewallRule -DisplayName "OmniChat_Dev_Mobile" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "OmniChat_Dev_CDP" -ErrorAction SilentlyContinue

Write-Host "Cleanup complete. Closing in 3 seconds..." -ForegroundColor Green
Start-Sleep -Seconds 3