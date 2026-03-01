# Footnotes Extension

A browser extension that provides an embedded terminal linked to your local machine, allowing you to use the Gemini CLI directly from a browser sidebar and easily save text as notes or "footnotes".

## Features
- **Embedded Terminal**: Uses `xterm.js` to provide a fully functional local terminal inside your browser's sidebar.
- **Local Backend Connection**: Connects to a local PTY (pseudo-terminal) via a WebSocket server (`backend.py`), running the `gemini --yolo` CLI interface.
- **Notetaker / Bookmark Integration**: Select any text block in the terminal to reveal a "📌 Save Note via Gemini" button. Clicking this button will automatically instruct the Gemini assistant to save the selected text as a note in the local workspace.

## Prerequisites
- Node.js and NPM
- Python 3.x
- `websockets` Python package (`pip install websockets`)
- `gemini` CLI installed and available in your PATH (expected at `/opt/homebrew/bin/gemini` or generic local path).

## Installation and Setup

### 1. Install Dependencies
Run the following command to install the frontend dependencies (`xterm.js` and its addons):
```bash
npm install
```

### 2. Start the Local Backend
The extension relies on a Python WebSocket backend to bridge the browser with your local terminal.
Run the backend server:
```bash
python backend.py
```
This will start a WebSocket server on `ws://127.0.0.1:8765`.

### 3. Load the Browser Extension
**For Chrome/Chromium:**
1. Navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** and select the folder containing this extension.

**For Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and select the `manifest.json` file.

## Usage
1. Click the extension icon in your browser to open the sidebar.
2. The sidebar will automatically connect to your local backend and display the Gemini CLI terminal.
3. You can interact with the Gemini CLI as you normally would.
4. **Saving a Footnote/Note**: Highlight any text within the terminal. A button labeled **📌 Save Note via Gemini** will appear in the bottom right corner. Click it to automatically send a note-taking instruction to Gemini, saving your highlighted text utilizing the built-in Notetaker skill.
