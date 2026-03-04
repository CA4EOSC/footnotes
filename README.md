# Pale Fire Footnotes Extension

A browser extension that acts as a robust research and metadata extraction engine for ClimateAdapt4EOSC project. It natively connects your browser to a persistent background local PTY (pseudo-terminal) backend (`backend.py`), running the `gemini --yolo` CLI interface.

## Features
- **CDIF & Machine Learning Metadata Mining**: Natively click **Analyze page** natively in your browser to extract complex numerical, qualitative, and geographical variables from the current webpage or YouTube video transcript into `CSV`. 
- **Automated Standard Compliance**: Instantly converts extracted variables into fully compliant `Croissant JSON-LD` packages and comprehensive `schema:Dataset` payload wrappers inside your local `cache/` directory.
- **Embedded Terminal**: Replaced the visual PTY terminal with a clean, Markdown-rendered native chat interface that seamlessly supports rich visual tables, bulleted lists, and active command execution.
- **Background Scripting Engine**: Automatically proxies file processing (like parsing heavy dataset tables and JSON schema writing) back to your local `palefire` python backend (`export_cdif.py`), entirely bypassing LLM token buffer limits.
- **Hover Action Macros**: Quickly highlight or interact with generated Markdown blocks to dynamically invoke skills natively against your OS (e.g. Save Notes, Delete Pages).

## Prerequisites
- Node.js and NPM
- `gemini` CLI installed and available in your PATH. Install it via NPM:
  ```bash
  npm install -g @google-gemini/gemini-cli
  ```


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
3. Click **Load unpacked** and select the `footnotes` extension directory.

**For Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and select the `manifest.json` file.

**For Safari:**
1. Enable the **Develop** menu: Go to `Safari > Settings > Advanced` and check **Show features for web developers**.
2. Enable **Allow Unsigned Extensions**: In the **Develop** menu, check **Allow Unsigned Extensions**.
3. Convert the extension: Open your terminal and run:
   ```bash
   xcrun safari-web-extension-converter footnotes
   ```
4. Build & Run: Open the generated Xcode project, click **Run**, and then enable the extension in Safari Settings.

### 3. Advanced: GKE Inference Engine Setup
This extension supports cost-effective LLM workloads by connecting to a GKE-hosted inference engine via the Gemini CLI and the `gke-mcp` extension.

For detailed instructions, see the [Google Cloud Blog: Use Gemini CLI for cost-effective LLM workloads on GKE](https://cloud.google.com/blog/products/containers-kubernetes/use-gemini-cli-for-cost-effective-llm-workloads-on-gke).

**Setup Steps:**
1. **Install Gemini CLI**:
   ```bash
   npm install -g @google-gemini/gemini-cli
   ```
2. **Install GKE Extension (gke-mcp)**:
   ```bash
   gemini extensions install https://github.com/GoogleCloudPlatform/gke-mcp.git
   ```
3. **Configure & Deploy**:
   Use natural language or the Inference Quickstart to deploy your models to GKE. Example:
   ```bash
   gemini "select and serve an LLM workload on my GKE cluster"
   ```

### 4. Usage
1. Click the extension icon in your browser toolbar to open the AI Footnotes sidebar.
2. The sidebar will automatically connect to your local backend and load your persistent interaction history.
3. **Automated Site Analysis**: Navigate to any complex webpage or YouTube video. Click the **"Analyze page"** button at the top of the chat. The LLM will fetch the video transcript (or DOM), summarize it, quietly orchestrate Python to write structural `Croissant JSON-LD` and `CSV` files directly to your backend, and ask if you'd like to render a Markdown table mapping all explicit variables found on the page.
4. If you answer "Yes," the extension utilizes Bash pipeline tricks to query its newly created local cache without hitting an LLM token wall.
