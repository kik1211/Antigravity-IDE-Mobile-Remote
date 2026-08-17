Write-Host "======================================================" -ForegroundColor DarkCyan
Write-Host "NETWORK AND FIREWALL AUDIT (OMNI CHAT)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor DarkCyan
Write-Host "Verifying if ports and forwarding rules are properly closed."
Write-Host ""

Write-Host "TEST 1: Port redirection (Portproxy)" -ForegroundColor Yellow
Write-Host "EXPECTED: The list below should be empty. If ports 4747, 7800, or 7801 are visible, they remain open." -ForegroundColor Gray
Write-Host "------------------------------------------------------"
netsh interface portproxy show v4tov4
Write-Host "------------------------------------------------------"
Write-Host ""

Write-Host "TEST 2: Windows Firewall Rules" -ForegroundColor Yellow
Write-Host "EXPECTED: The command should return no results. If 'OmniChat_Dev' items appear, rules were not deleted." -ForegroundColor Gray
Write-Host "------------------------------------------------------"
Get-NetFirewallRule | Where-Object { $_.DisplayName -match "OmniChat" } | Format-Table DisplayName, Enabled, Action, Direction
Write-Host "------------------------------------------------------"
Write-Host ""

Write-Host "Audit completed. If no rules are shown above, your system is secure." -ForegroundColor Green
Write-Host ""