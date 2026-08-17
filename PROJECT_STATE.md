# Project State

## Project
**OmniAntigravityRemoteChat**
Local Path: `d:\PROJECTS\OmniAntigravityLite`

## Upstream Origin
The upstream origin is `https://github.com/diegosouzapw/OmniAntigravityRemoteChat` (found in `package.json`).

## Current Purpose
Provide a mobile-first remote interface for Antigravity IDE. It connects via CDP to extract conversation data, quota, and allow remote clicking/typing from a mobile device (Lite Mode).

## Architecture
- **Backend (`src/server.js`)**: Express server providing HTTP/WS. Launches Antigravity with remote debugging.
- **Data Source (`src/conversation-store.js`)**: Identifies the active SQLite database by querying CDP for DOM UUIDs, falls back to `mtime`, and watches the `.db` file for changes.
- **Decoding (`src/conversation-decoder.js`)**: Parses protobuf from the SQLite payload to reconstruct the conversation.
- **Frontend (`public/js/minimal.js`, `public/js/artifacts-ui.js`)**: Subscribes to websocket for `snapshot_update` events, fetching `/api/conversation.json` and rendering it. Uses `marked.js` for documents.

## Important Files
- [`src/server.js`](src/server.js): Main entry point and Express server.
- [`src/conversation-store.js`](src/conversation-store.js): Manages finding and reading the active conversation SQLite DB.
- [`src/conversation-decoder.js`](src/conversation-decoder.js): Protobuf parser for SQLite messages.
- [`src/quota-service.js`](src/quota-service.js): Extracts quota information dynamically via CDP by navigating IDE settings.
- [`public/js/minimal.js`](public/js/minimal.js): Lite mode client logic.
- [`public/js/artifacts-ui.js`](public/js/artifacts-ui.js): Document viewer logic.

## Working Features
### CONFIRMED WORKING
- **Quota System**: Extracts Gemini/Claude values via CDP successfully.
- **Document Viewer**: `public/artifacts.html` correctly lists files and supports live updates and zooming.
- **Lite Mode Architecture**: Uses a one-way data flow fetching all messages from `/api/conversation.json` and rendering them, keeping scroll state.

## Known Bugs
- None currently identified as user-facing related to conversation decoding.

## Current Decoder Status
### CONFIRMED WORKING (OUTCOME A - NO DECODER CHANGE REQUIRED)
The conversation decoder (`src/conversation-decoder.js`) successfully opens the SQLite database and enumerates steps. While raw decoder inspection exposes internal/tool fields and some potential semantic anomalies (e.g., extracting tool arguments instead of results), these are intentionally excluded from the mobile presentation. Therefore the presence of such fields in raw decoder output does not by itself constitute a product bug.
- **Evidence**: Tracing the runtime data flow (`src/conversation-reconstructor.js`) shows that tool activity and internal reasoning are grouped into the `events` array of `assistant` messages. The Lite Mode UI (`public/js/chat-renderer.js`) deliberately iterates only over top-level messages and ignores the `events` array, perfectly satisfying the user's explicit requirement to filter out tool activity and internal reasoning. Full user prompts are successfully decoded and fully rendered without truncation. Markdown is handled natively.

## Current Lite Mode Status
### CONFIRMED WORKING
Lite mode rendering correctly fetches the normalized JSON list without relying on virtualized DOM scrolling or "Load More" pagination. The data source architecture is sound. The scroll follows the bottom when already at the bottom and doesn't force the user back down after scrolling up.

## Current Documents Status
### CONFIRMED WORKING
The Current Conversation document relies on the same backend `conversation-store` endpoint. Markdown rendering and zooming controls exist in `artifacts-ui.js`. There is no separate manually synchronized markdown file for the current conversation, preserving the single source of truth.

## Current Quota Status
### CONFIRMED WORKING
Implemented via `src/quota-service.js`, using a CDP script to simulate navigation to the Models tab, parse text nodes to retrieve Gemini/Claude quotas, and restore the previous tab seamlessly.

## CDP/Startup Requirements
### IMPLEMENTED BUT NEEDS VERIFICATION
The application relies on Antigravity running with CDP enabled on port 7800. `server.js` manages connections and broadcasting. 

## Testing
### CONFIRMED WORKING
Unit tests are present in `test/`, including `test-conversation-decoder.js` which accurately runs against the active SQLite database to output the parsed contents. Additional scripts exist in `scripts/`.

## Git Status
### OUT OF SCOPE
Git commands (`git status`, `git log`) failed in this environment as the `git` executable is not recognized. Additionally, no `.git` directory was found at the repository root.

## Security Notes
- **Hardcoded Secret**: `src/server.js` (line 100) contains a hardcoded `AUTH_TOKEN = 'ag_default_token'`. This should be moved to an environment variable.
- **Missing File Exclusions**: Since `.gitignore` is completely absent, there's a risk of committing temporary data or secrets.

## License / Attribution
### IMPLEMENTED BUT NEEDS VERIFICATION
`package.json` specifies `GPL-3.0-only` and points to the upstream URL. However, the `LICENSE` and `README.md` files are completely missing from the local directory despite being listed in the `files` array of `package.json`.

## GitHub Publication Plan
- Identify exact modifications versus upstream.
- Ensure all secrets (like `AUTH_TOKEN` or `TELEGRAM_BOT_TOKEN`) are removed from history and source.
- Restore or create appropriate attribution and `LICENSE` files.
- Add a `.gitignore` to prevent tracking `node_modules` or local DBs.
- Keep repository private initially.

## Recent Enhancements (UI & Documents Pass 1)
- **Collapsible User Prompts**: Long user prompts in Current Conversation now display a compact preview (limited via CSS line clamping) with an inline expand/collapse toggle, keeping the full prompt intact.
- **Scroll Controls**: The Scroll-to-Bottom button was relocated to bottom-center and resized to prevent overlap. A Scroll-to-Top button was added next to it, appearing when the user scrolls up.
- **Project File Discovery**: The Documents viewer was extended to discover and display recently modified project files (e.g., `PROJECT_STATE.md`, `.js`, etc.). Git installation failed (requires admin rights), so discovery uses a secure filesystem fallback restricted to the project root with exclusions for sensitive directories/files (`.git`, `node_modules`, `.env`, keys, DBs). Strict path traversal protection prevents accessing files outside `process.cwd()`.

## Recent Enhancements (UI & Documents Pass 2)
- **Copy Buttons**: Added tiny, touch-friendly Copy buttons under every user prompt and assistant response. They copy the raw, exact text (not HTML) securely to the clipboard using the Clipboard API and provide subtle checkmark feedback.
- **Scroll Controls Refinement**: The scroll buttons were stacked cleanly and compactly in the bottom-center, floating gracefully above the composer.
- **Document Downloads**: Added a small Download button to every item in the Documents viewer. Project files are downloaded securely via the same `/api/artifacts` endpoint using an anchor tag. Current Conversation is dynamically generated and downloaded client-side directly from `/api/conversation.json` as a Blob, avoiding disk pollution.
- **Screen View (Screencast)**: Recovered and integrated the original upstream Screen View feature based on CDP `Page.startScreencast`. It operates on demand (Refresh) or continuous (Start/Stop Live), streaming base64 JPEG frames via WebSocket. Screen View enforces explicit lifecycle cleanup (stopping on `beforeunload` or visibility loss) to prevent bandwidth drain and runaway memory usage. It acts directly over the shared CDP connection, safely restricted to authenticated remote sessions.

## Current Next Task
Future tasks should focus on resolving the hardcoded `AUTH_TOKEN` and restoring appropriate repository configuration (such as `.gitignore` and `LICENSE`).
