const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const saveNoteBtn = document.getElementById('save-note-btn');
const switchFocusBtn = document.getElementById('switch-focus-btn');

let ws = null;
let isWaitingForResponse = false;
let currentThinkingId = null;

let pages = [];
let currentPageIndex = 0;
const messagesContainer = document.getElementById('messages-container');
const paginationContainer = document.getElementById('pagination-container');

// Global Context Menu elements
const globalActionMenu = document.getElementById('global-action-menu');
const menuSaveBtn = document.getElementById('menu-save-txt');
const menuDeleteBtn = document.getElementById('menu-delete-page');
let contextMenuTargetIndex = -1; // stores which page is targeted by the open menu

// Initialize Markdown parser safely
marked.setOptions({
    breaks: true, // translate newlines into <br>
    gfm: true
});

function updateStatus(connected) {
    if (connected) {
        statusDot.className = "w-2 h-2 rounded-full bg-green-500";
        statusText.textContent = "Connected";
    } else {
        statusDot.className = "w-2 h-2 rounded-full bg-red-500";
        statusText.textContent = "Disconnected";
    }
}

function connect() {
    ws = new WebSocket('ws://127.0.0.1:8775');

    ws.onopen = () => {
        updateStatus(true);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'response') {
                removeThinkingIndicator();
                appendMessage(data.data, 'ai');
                isWaitingForResponse = false;
                updateInputState();
            } else if (data.type === 'error') {
                removeThinkingIndicator();
                appendMessage(`**Error:** ${data.data}`, 'ai', true);
                isWaitingForResponse = false;
                updateInputState();
            } else if (data.type === 'restore_running') {
                // The backend notified us that a task is already running for our dropped connection!
                if (pages.length === 0 || !pages[currentPageIndex].some(m => m.role === 'user')) {
                    appendMessage(data.data, 'user');
                }
                isWaitingForResponse = true;
                updateInputState();
                if (!currentThinkingId) showThinkingIndicator();
            } else if (data.type === 'cache_data') {
                if (data.data && data.data.length > 0) {
                    pages = data.data;
                    currentPageIndex = pages.length - 1;
                    renderPagination();
                    renderCurrentPage();
                } else if (pages.length === 0) {
                    // Cache is empty explicitly from backend! Run the first-time logic safely
                    const browserApi = typeof browser !== 'undefined' ? browser : chrome;
                    if (browserApi && browserApi.tabs) {
                        browserApi.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (tabs && tabs.length > 0 && tabs[0].url) {
                                const currentUrl = tabs[0].url;
                                // Ignore internal browser pages
                                if (!currentUrl.startsWith('chrome://') && !currentUrl.startsWith('about:') && !currentUrl.startsWith('moz-extension://') && !currentUrl.startsWith('chrome-extension://')) {
                                    const autoPrompt = `describe ${currentUrl}`;
                                    appendMessage(autoPrompt, 'user');
                                    ws.send(JSON.stringify({ type: 'input', data: autoPrompt }));
                                    isWaitingForResponse = true;
                                    updateInputState();
                                    showThinkingIndicator();
                                } else {
                                    appendMessage('Pale Fire Footnotes is online. How can I assist you today?', 'ai');
                                }
                            } else {
                                appendMessage('Pale Fire Footnotes is online. How can I assist you today?', 'ai');
                            }
                        });
                    } else {
                        appendMessage('Pale Fire Footnotes is online. How can I assist you today?', 'ai');
                    }
                }
            }
        } catch (e) {
            console.error("Message parsing failed:", e);
        }
    };

    ws.onclose = () => {
        updateStatus(false);
        // If we were waiting for a response, we stop waiting.
        if (isWaitingForResponse) {
            removeThinkingIndicator();
            appendMessage(`**Connection Lost:** The backend server disconnected before responding. I will retry connecting...`, 'ai', true);
            isWaitingForResponse = false;
            updateInputState();
        }
        setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        // Will close and reconnect natively
    };
}

function updateInputState() {
    if (isWaitingForResponse) {
        sendBtn.disabled = true;
        chatInput.disabled = true;
    } else {
        sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

function scrollToBottom() {
    messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
    chatContainer.scrollTo({ top: chatContainer.scrollHeight + 100, behavior: 'smooth' });
}

function createNewPage() {
    pages.push([]);
    currentPageIndex = pages.length - 1;
    renderPagination();
}

function savePagesToBackend() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'save_cache', data: pages }));
    }
}

function appendMessage(text, role, isError = false, forceSamePage = false) {
    if (pages.length === 0) createNewPage();

    // If inserting a user message, and the current page already has an AI response, build a new page!
    if (role === 'user' && !forceSamePage && pages[currentPageIndex].some(m => m.role === 'ai' && m.text !== 'Pale Fire Footnotes is online. How can I assist you today?')) {
        createNewPage();
    }

    pages[currentPageIndex].push({ text, role, isError });
    renderCurrentPage();
    savePagesToBackend();
}

function renderPagination() {
    paginationContainer.innerHTML = '';

    if (pages.length <= 1) return; // Don't show pagination clutter for 1 page

    // Pagination logic for >9 pages
    let startPage = 0;
    let endPage = pages.length - 1;
    let totalPages = pages.length;

    if (totalPages > 9) {
        startPage = Math.max(0, currentPageIndex - 4);
        endPage = Math.min(totalPages - 1, startPage + 8);
        if (endPage - startPage < 8) {
            startPage = Math.max(0, endPage - 8);
        }
    }

    if (startPage > 0) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '<<';
        prevBtn.className = 'w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition cursor-pointer bg-transparent text-gray-500 hover:bg-gray-100 placeholder';
        prevBtn.onclick = () => {
            if (isWaitingForResponse) return;
            currentPageIndex = Math.max(0, startPage - 1);
            renderPagination();
            renderCurrentPage();
        };
        paginationContainer.appendChild(prevBtn);
    }

    for (let index = startPage; index <= endPage; index++) {
        const btn = document.createElement('button');
        btn.textContent = index + 1;
        btn.className = `w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-medium transition cursor-pointer ${index === currentPageIndex ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`;

        btn.onclick = () => {
            if (isWaitingForResponse) return; // Prevent switching pages while AI is actively typing
            currentPageIndex = index;
            renderPagination();
            renderCurrentPage();
        };
        paginationContainer.appendChild(btn);
    }

    if (endPage < totalPages - 1) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '>>';
        nextBtn.className = 'w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition cursor-pointer bg-transparent text-gray-500 hover:bg-gray-100 placeholder';
        nextBtn.onclick = () => {
            if (isWaitingForResponse) return;
            currentPageIndex = Math.min(totalPages - 1, endPage + 1);
            renderPagination();
            renderCurrentPage();
        };
        paginationContainer.appendChild(nextBtn);
    }
}

function renderCurrentPage() {
    messagesContainer.innerHTML = '';

    if (pages.length === 0) return;

    // Mount all static messages for the requested page
    pages[currentPageIndex].forEach(msg => {
        const wrapper = document.createElement('div');
        wrapper.className = `flex w-full group relative ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`;

        const bubbleWrapper = document.createElement('div');
        bubbleWrapper.className = `flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[95%]`;

        const bubble = document.createElement('div');
        bubble.className = `bubble p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`;

        if (msg.isError) {
            bubble.classList.add('border-red-300', 'bg-red-50', 'text-red-800');
        }

        if (msg.role === 'ai') {
            bubble.innerHTML = marked.parse(msg.text);
        } else {
            bubble.textContent = msg.text;
        }

        bubbleWrapper.appendChild(bubble);

        // Append a tiny options button beneath User prompts only to trigger QA menu
        if (msg.role === 'user') {
            const optsBtn = document.createElement('button');
            optsBtn.className = 'msg-options-btn';
            optsBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                </svg>
            `;
            optsBtn.onclick = (e) => {
                e.stopPropagation();
                // Position popup near the click
                const rect = optsBtn.getBoundingClientRect();
                globalActionMenu.style.top = `${rect.bottom + window.scrollY}px`;
                // Try aligning it properly so it doesn't clip right screen
                const rightEdge = rect.right;
                if (rightEdge - 140 > 0) {
                    globalActionMenu.style.left = `${rightEdge - 140}px`;
                } else {
                    globalActionMenu.style.left = `${rect.left}px`;
                }

                contextMenuTargetIndex = currentPageIndex;
                globalActionMenu.classList.add('visible');
            }
            bubbleWrapper.appendChild(optsBtn);
        }

        wrapper.appendChild(bubbleWrapper);
        messagesContainer.appendChild(wrapper);
    });

    // Mount the thinking indicator if this page is actively awaiting context
    if (currentThinkingId && currentPageIndex === pages.length - 1) {
        const wrapper = document.createElement('div');
        wrapper.id = currentThinkingId;
        wrapper.className = `flex w-full justify-start`;

        const bubble = document.createElement('div');
        bubble.className = `bubble p-4 rounded-2xl text-sm shadow-sm bubble-ai flex items-center justify-center`;

        bubble.innerHTML = `<div class="dots"><span></span><span></span><span></span></div>`;

        wrapper.appendChild(bubble);
        messagesContainer.appendChild(wrapper);
    }

    scrollToBottom();
}

function showThinkingIndicator() {
    currentThinkingId = 'think-' + Date.now();
    renderCurrentPage();
}

function removeThinkingIndicator() {
    currentThinkingId = null;
    renderCurrentPage();
}

// Auto-resizing textarea
chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Handle Enter to send
chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

// Handle Submit
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let text = chatInput.value.trim();
    if (!text || isWaitingForResponse || !ws || ws.readyState !== WebSocket.OPEN) return;

    if (text.toLowerCase().startsWith('describe ') && (text.includes('youtube.com/watch') || text.includes('youtu.be/'))) {
        text = text.replace(/^describe\s+/i, 'describe transcript ');
    }

    appendMessage(text, 'user');
    chatInput.value = '';
    chatInput.style.height = 'auto'; // reset resize

    // Form the websocket packet
    ws.send(JSON.stringify({ type: 'input', data: text }));

    isWaitingForResponse = true;
    updateInputState();
    showThinkingIndicator();
});

// Selection logic for Notetaker skill
document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const text = selection.toString();

    if (text.trim().length > 0) {
        // Calculate position slightly above the selection
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        saveNoteBtn.style.display = 'block';
        saveNoteBtn.style.top = `${rect.top + window.scrollY - 40}px`;

        // Ensure button doesnt render outside view horizontally
        let leftPx = rect.left + (rect.width / 2) - (saveNoteBtn.offsetWidth / 2);
        leftPx = Math.max(10, Math.min(leftPx, window.innerWidth - saveNoteBtn.offsetWidth - 10));
        saveNoteBtn.style.left = `${leftPx}px`;
    } else {
        saveNoteBtn.style.display = 'none';
    }
});

saveNoteBtn.addEventListener('click', () => {
    const text = window.getSelection().toString();
    if (text && ws && ws.readyState === WebSocket.OPEN && !isWaitingForResponse) {
        const command = `Take a note containing this text. You MUST perfectly save this file inside the "cache" directory:\n\n${text}`;

        appendMessage("📌 *Saving captured footnote to cache folder...*", 'user', false, true);
        ws.send(JSON.stringify({ type: 'input', data: command }));

        window.getSelection().removeAllRanges();
        saveNoteBtn.style.display = 'none';

        isWaitingForResponse = true;
        updateInputState();
        showThinkingIndicator();
    }
});

// Switch Focus button logic
switchFocusBtn.addEventListener('click', () => {
    if (isWaitingForResponse || !ws || ws.readyState !== WebSocket.OPEN) return;

    const browserApi = typeof browser !== 'undefined' ? browser : chrome;
    if (browserApi && browserApi.tabs) {
        browserApi.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0 && tabs[0].url) {
                const currentTab = tabs[0];
                const currentUrl = currentTab.url;
                if (!currentUrl.startsWith('chrome://') && !currentUrl.startsWith('about:') && !currentUrl.startsWith('moz-extension://') && !currentUrl.startsWith('chrome-extension://')) {

                    if (currentUrl.includes('youtube.com/watch') || currentUrl.includes('youtu.be/')) {
                        const autoPrompt = `describe transcript ${currentUrl}`;
                        if (pages.length === 0 || pages[currentPageIndex].length > 0) {
                            createNewPage();
                        }
                        appendMessage(`*Analyzing video ${currentUrl}*`, 'user');
                        ws.send(JSON.stringify({ type: 'input', data: autoPrompt }));
                        isWaitingForResponse = true;
                        updateInputState();
                        showThinkingIndicator();
                        return;
                    }

                    if (currentUrl.includes('dataset.xhtml?persistentId=')) {
                        if (browserApi.scripting) {
                            browserApi.scripting.executeScript({
                                target: { tabId: currentTab.id },
                                func: () => {
                                    const loc = window.location.href;
                                    const apiUrl = loc.replace('dataset.xhtml?persistentId=', 'api/datasets/export?exporter=OAI_ORE&persistentId=');
                                    return fetch(apiUrl).then(res => res.text());
                                }
                            }).then((results) => {
                                let extractedText = '';
                                if (results && results[0] && results[0].result) {
                                    extractedText = results[0].result.trim().substring(0, 30000);
                                }
                                const autoPrompt = `Describe the dataset ${currentUrl} with the following OAI_ORE JSON-LD metadata:\n\n${extractedText}`;
                                if (pages.length === 0 || pages[currentPageIndex].length > 0) {
                                    createNewPage();
                                }
                                appendMessage(`*Retrieving OAI_ORE JSON-LD export to describe dataset...*`, 'user');
                                ws.send(JSON.stringify({ type: 'input', data: autoPrompt }));
                                isWaitingForResponse = true;
                                updateInputState();
                                showThinkingIndicator();
                            }).catch((err) => {
                                console.warn("Dataset metadata fetch failed:", err);
                            });
                        }
                        return;
                    }

                    if (browserApi.scripting) {
                        try {
                            browserApi.scripting.executeScript({
                                target: { tabId: currentTab.id },
                                func: () => {
                                    if (window.location.hostname === 'docs.google.com') {
                                        let text = '';
                                        const paragraphs = document.querySelectorAll('.kix-paragraphrenderer');
                                        if (paragraphs.length > 0) {
                                            text = Array.from(paragraphs).map(p => p.textContent).join('\\n');
                                        }
                                        if (!text) {
                                            const pages = document.querySelectorAll('.kix-page');
                                            if (pages.length > 0) {
                                                text = Array.from(pages).map(p => p.textContent).join('\\n');
                                            }
                                        }
                                        return text || document.body.innerText;
                                    }
                                    return document.body.innerText;
                                }
                            }).then((results) => {
                                let extractedText = '';
                                if (results && results[0] && results[0].result) {
                                    extractedText = results[0].result.trim().substring(0, 15000);
                                }

                                const autoPrompt = extractedText.length > 0
                                    ? `Describe the page ${currentUrl} with the following extracted text:\n\n${extractedText}\n\nAct as a CDIF expert. Do the background caching (Croissant, CSV, JSON-LD) but DO NOT print the Markdown table yet. Instead, end your response by asking: "Do you want to see all variables in CDIF format from this page in a table?".`
                                    : `Describe the page ${currentUrl}. Act as a CDIF expert. Do the background caching (Croissant, CSV, JSON-LD) but DO NOT print the Markdown table yet. Instead, end your response by asking: "Do you want to see all variables in CDIF format from this page in a table?".`;

                                if (pages.length === 0 || pages[currentPageIndex].length > 0) {
                                    createNewPage();
                                }

                                appendMessage(`*Switching focus to describe the page ${currentUrl}*`, 'user');
                                ws.send(JSON.stringify({ type: 'input', data: autoPrompt }));
                                isWaitingForResponse = true;
                                updateInputState();
                                showThinkingIndicator();
                            }).catch((err) => {
                                console.warn("Script injection failed. Falling back to basic fetch:", err);

                                const autoPrompt = `Describe the page ${currentUrl}. Act as a CDIF expert. Do the background caching (Croissant, CSV, JSON-LD) but DO NOT print the Markdown table yet. Instead, end your response by asking: "Do you want to see all variables in CDIF format from this page in a table?".`;
                                if (pages.length === 0 || pages[currentPageIndex].length > 0) {
                                    createNewPage();
                                }
                                appendMessage(`*Switching focus to describe the page ${currentUrl}*`, 'user');
                                ws.send(JSON.stringify({ type: 'input', data: autoPrompt }));
                                isWaitingForResponse = true;
                                updateInputState();
                                showThinkingIndicator();
                            });
                        } catch (err) {
                            console.warn("Script execution error. Falling back.", err);
                            const autoPrompt = `Describe the page ${currentUrl}. Act as a CDIF expert. Do the background caching (Croissant, CSV, JSON-LD) but DO NOT print the Markdown table yet. Instead, end your response by asking: "Do you want to see all variables in CDIF format from this page in a table?".`;
                            if (pages.length === 0 || pages[currentPageIndex].length > 0) {
                                createNewPage();
                            }
                            appendMessage(`*Switching focus to describe the page ${currentUrl}*`, 'user');
                            ws.send(JSON.stringify({ type: 'input', data: autoPrompt }));
                            isWaitingForResponse = true;
                            updateInputState();
                            showThinkingIndicator();
                        }
                    } else {
                        // Fallback if scripting API is unavailable
                        const autoPrompt = `Describe the page ${currentUrl}. Act as a CDIF expert. Do the background caching (Croissant, CSV, JSON-LD) but DO NOT print the Markdown table yet. Instead, end your response by asking: "Do you want to see all variables in CDIF format from this page in a table?".`;
                        if (pages.length === 0 || pages[currentPageIndex].length > 0) {
                            createNewPage();
                        }
                        appendMessage(`*Switching focus to describe the page ${currentUrl}*`, 'user');
                        ws.send(JSON.stringify({ type: 'input', data: autoPrompt }));
                        isWaitingForResponse = true;
                        updateInputState();
                        showThinkingIndicator();
                    }
                } else {
                    alert('Cannot switch focus to an internal browser page.');
                }
            } else {
                alert('No active tab found.');
            }
        });
    } else {
        alert('Browser Tabs API not available.');
    }
});

// Dropdown Action Listeners
document.addEventListener('click', (e) => {
    // any click outside the button/menu hides the menu
    if (!globalActionMenu.contains(e.target)) {
        globalActionMenu.classList.remove('visible');
    }
});

menuSaveBtn.addEventListener('click', () => {
    if (contextMenuTargetIndex < 0 || contextMenuTargetIndex >= pages.length) return;
    globalActionMenu.classList.remove('visible');

    if (isWaitingForResponse || !ws || ws.readyState !== WebSocket.OPEN) return;

    // Concat all text in the targeted page into a solid transcript
    const targetPage = pages[contextMenuTargetIndex];
    let fullTranscript = '';
    targetPage.forEach(p => {
        fullTranscript += `${p.role.toUpperCase()}: ${p.text}\n\n`;
    });

    const command = `Take a note containing this QA log text. You MUST perfectly save this file inside the "cache" directory:\n\n${fullTranscript}`;
    appendMessage("📌 *Saving conversation history to cache folder...*", 'user', false, true);
    ws.send(JSON.stringify({ type: 'input', data: command }));

    isWaitingForResponse = true;
    updateInputState();
    showThinkingIndicator();
});

menuDeleteBtn.addEventListener('click', () => {
    if (contextMenuTargetIndex < 0 || contextMenuTargetIndex >= pages.length) return;
    globalActionMenu.classList.remove('visible');

    if (isWaitingForResponse) return; // Prevent breaking array if actively indexing it!

    pages.splice(contextMenuTargetIndex, 1);

    // Shift current page pointer if necessary
    if (currentPageIndex >= pages.length) {
        currentPageIndex = Math.max(0, pages.length - 1);
    }

    renderPagination();
    renderCurrentPage();
    savePagesToBackend();
});

// Initiate connection pipeline
connect();
