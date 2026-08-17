# Omni Chat & Antigravity - Windows + WSL2 Integration

This directory contains integration scripts to connect **Antigravity (Windows)** with **Omni Chat (WSL2)** seamlessly. It provides an automated setup for local or external access, bypassing cases where WSL2 Mirrored Mode networking is unavailable.

## Overview

The PowerShell scripts handle firewall permissions, temporary IP forwarding via `netsh portproxy`, and multi-process execution. With a single administrative run, they initiate the Antigravity application on the Windows host and the Omni Chat Node server inside a `socat` tunnel in WSL2.

## Setup Instructions

1. **Create the configuration file**  
   Rename or copy the provided `config.json.example` to `config.json`:
   ```powershell
   Copy-Item config.json.example config.json
   ```
2. **Set your local paths** in the new `config.json`:
   ```json
   {
     "antigravityPath": "C:\\Users\\YourUsername\\AppData\\Local\\Programs\\Antigravity\\Antigravity.exe",
     "omniChatWslPath": "/home/your_username/OmniChat",
     "omniChatCommand": "npx omni-antigravity-remote-chat"
   }
   ```
   *(Note: `config.json` is excluded via `.gitignore` to prevent committing personal paths).*

3. **Install WSL prerequisites**  
   Open your WSL terminal and install the tools required for network tunneling:
   ```bash
   sudo apt update && sudo apt install -y socat curl
   ```

## Script Usage

Run the scripts by right-clicking them and selecting **"Run with PowerShell as Administrator"**.

### 1. Local Network Access
**File:** `Start-OmniChat.ps1`
- **Purpose:** Initiates a `socat` tunnel bridging WSL2 and the Windows Host. It exposes your environment to your local network, allowing testing from devices like mobile phones connected to the same Wi-Fi. It performs an automatic environment cleanup on exit.
- **Use case:** Local testing and development.

### 2. External Access via Ngrok
**File:** `Start-OmniChat-Ngrok.ps1`
- **Purpose:** Similar to the local script, but automatically tunnels the connection through ngrok. It prints the generated public URL directly to the PowerShell console, offering better stability over mobile networks (4G/5G).
- **Use case:** Remote access or sharing the development environment globally.

### 3. Cleanup and Security Audit
**File:** `Check-Security.ps1`
- **Purpose:** If a primary script is forcefully terminated (e.g., closing the window directly instead of pressing ENTER), the automatic cleanup protocol might fail. This script audits the system for residual configurations.
- **Usage:** Run this check to list any active `portproxy` bridges or temporary Windows Firewall rules associated with OmniChat. If the output is empty, the system is clean.
