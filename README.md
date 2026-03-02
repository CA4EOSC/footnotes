# Pale Fire Footnotes Extension

A browser extension that acts as a robust research and metadata extraction engine. It natively connects your browser to a persistent background local PTY (pseudo-terminal) backend (`backend.py`), running the `gemini --yolo` CLI interface.

## Features
- **CDIF & Machine Learning Metadata Mining**: Natively click **Analyze page** natively in your browser to extract complex numerical, qualitative, and geographical variables from the current webpage or YouTube video transcript into `CSV`. 
- **Automated Standard Compliance**: Instantly converts extracted variables into fully compliant `Croissant JSON-LD` packages and comprehensive `schema:Dataset` payload wrappers inside your local `cache/` directory.
- **Embedded Terminal**: Replaced the visual PTY terminal with a clean, Markdown-rendered native chat interface that seamlessly supports rich visual tables, bulleted lists, and active command execution.
- **Background Scripting Engine**: Automatically proxies file processing (like parsing heavy dataset tables and JSON schema writing) back to your local `palefire` python backend (`export_cdif.py`), entirely bypassing LLM token buffer limits.
- **Hover Action Macros**: Quickly highlight or interact with generated Markdown blocks to dynamically invoke skills natively against your OS (e.g. Save Notes, Delete Pages).

## Prerequisites
- Node.js and NPM
- Python 3.x
- `websockets` Python package (`pip install websockets`)
- `youtube-transcript-api` Python package
- `gemini` CLI installed and available in your PATH (expected at `/opt/homebrew/bin/gemini` or generic local path).

## Architecture Details
This project cleanly separates concerns into two distinct areas:
- **`palefire/backend`**: Hosts the `backend.py` WebSocket runner and dynamic processing scripts like `export_cdif.py`. Holds your core skill templates.
- **`footnotes`**: Hosts the actual browser extension (the `sidebar.html`, manifest, and JavaScript UI logic), providing the chat interface, macro buttons, and cache directories (`/cache/`).

## Quickstart & Installation

### 1. Start the Local Backend
The extension relies on a Python WebSocket backend to bridge the browser with your local compute capabilities. Open your terminal and run the backend server from the `palefire` repository:

```bash
git clone https://github.com/agstack/palefire.git
cd palefire/backend
python3 backend.py
```
*(This will start a robust, persistent WebSocket server on `ws://127.0.0.1:8775`)*

### 2. Load the Browser Extension
**For Chrome/Chromium:**
1. Navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** and select the `/Users/vyacheslavtykhonov/projects/footnotes` extension directory.

**For Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and select the `manifest.json` file.

### 3. Usage
1. Click the extension icon in your browser toolbar to open the AI Footnotes sidebar.
2. The sidebar will automatically connect to your local backend and load your persistent interaction history.
3. **Automated Site Analysis**: Navigate to any complex webpage or YouTube video. Click the **"Analyze page"** button at the top of the chat. The LLM will fetch the video transcript (or DOM), summarize it, quietly orchestrate Python to write structural `Croissant JSON-LD` and `CSV` files directly to your backend, and ask if you'd like to render a Markdown table mapping all explicit variables found on the page.
4. If you answer "Yes," the extension utilizes Bash pipeline tricks to query its newly created local cache without hitting an LLM token wall.
