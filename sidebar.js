// Initialize xterm.js
const term = new Terminal({
    cursorBlink: true,
    fontFamily: 'monospace',
    theme: {
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#000000',
        selectionBackground: '#cce1fb'
    }
});
const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

// Add WebLinks Addon to make HTTP/HTTPS clickable
const webLinksAddon = new WebLinksAddon.WebLinksAddon();
term.loadAddon(webLinksAddon);

term.open(document.getElementById('terminal-container'));

// Resize terminal initially
fitAddon.fit();

window.addEventListener('resize', () => {
    fitAddon.fit();
});

term.writeln('\x1b[36mInitializing Gemini CLI Terminal connection...\x1b[0m');

let ws = null;

function connect() {
    ws = new WebSocket('ws://127.0.0.1:8765');

    ws.onopen = () => {
        term.writeln('\x1b[32mConnected to local backend.\x1b[0m');
        // Let the server know initial size
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
            term.write(event.data);
        } else {
            const reader = new FileReader();
            reader.onload = () => term.write(reader.result);
            reader.readAsText(event.data);
        }
    };

    ws.onclose = () => {
        term.writeln('\r\n\x1b[31mDisconnected. Retrying in 3 seconds...\x1b[0m');
        setTimeout(connect, 3000);
    };

    ws.onerror = () => {
        // Error will trigger onclose which handles reconnect
    };
}

// Ensure resize events sync with the backend
term.onResize(size => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: size.cols, rows: size.rows }));
    }
});

// Capture typing and send to backend
term.onData(data => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data: data }));
    }
});

// Initial connection
connect();

// Selection logic for Notetaker skill
const saveNoteBtn = document.getElementById('save-note-btn');

term.onSelectionChange(() => {
    if (term.hasSelection()) {
        const text = term.getSelection();
        if (text.trim().length > 0) {
            saveNoteBtn.style.display = 'block';
        } else {
            saveNoteBtn.style.display = 'none';
        }
    } else {
        saveNoteBtn.style.display = 'none';
    }
});

saveNoteBtn.addEventListener('click', () => {
    const text = term.getSelection();
    if (text && ws && ws.readyState === WebSocket.OPEN) {
        // Send a custom instruction utilizing the notetaker skill directly 
        // We use \r to mimic hitting Enter, which guarantees submission if Gemini is waiting at prompt
        const command = `\rTake a note containing this text:\n\n${text}\r\n`;
        ws.send(JSON.stringify({ type: 'input', data: command }));

        term.clearSelection();
        saveNoteBtn.style.display = 'none';
    }
});
