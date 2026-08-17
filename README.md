# OmniAntigravityLite

A premium mobile-first remote interface for Antigravity AI coding sessions. OmniAntigravityLite allows you to securely connect your phone to an active desktop Antigravity session via CDP (Chrome DevTools Protocol), giving you full control over the conversation, prompting, and project context from your mobile device.

## Features

- **Mobile Chat Interface:** Full responsive chat tailored for mobile screens.
- **Live Conversation Mirroring:** Syncs in real-time with your active desktop session.
- **Documents & Project Files Viewer:** Browse and read recently modified workspace files.
- **Copy Controls:** Easily copy model outputs.
- **Prompt Formatting:** Clean expand/collapse views for long reasoning and multi-turn conversations.
- **Scroll Controls:** Fast jump-to-top and jump-to-bottom buttons optimized for mobile scrolling.
- **Running Status Indicator:** Unobtrusive visual indicator when the model is generating.

## Upstream Attribution

This project is a heavily modified fork of the excellent **OmniAntigravityRemoteChat** created by Diego Souza. 
- Original Project: [https://github.com/diegosouzapw/OmniAntigravityRemoteChat](https://github.com/diegosouzapw/OmniAntigravityRemoteChat)
- Original Author: Diego Souza <diegosouzapw@gmail.com>

## Installation & Startup

1. **Clone the repository.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure the environment:**
   Create a `.env` file in the project root based on `.env.example` and set a secure `APP_PASSWORD`.
4. **Start the server:**
   ```bash
   npm start
   ```
5. **Connect from your Phone:**
   Navigate to `http://<YOUR-PC-IP>:4747` in your mobile browser. You will be prompted for the `APP_PASSWORD`.

## Security

This application uses a local web server to bridge CDP commands to the running Antigravity instance. 
- Do **not** expose this server directly to the public internet without the built-in password protection or an external tunnel auth provider.
- Keep your `.env` file secure.

## License

This project is licensed under the GPL-3.0 License. See the `LICENSE` file for more details.
