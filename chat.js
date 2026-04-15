// ============================================================
// CHAT WIDGET → n8n Chat Webhook
// ============================================================

// Uses CONFIG.CHAT_WEBHOOK_URL from config.js

const chatPanel = document.getElementById('chatPanel');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSend');
const chatError = document.getElementById('chatError');

let chatOpen = false;
let chatSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);

// Toggle chat panel open/close
function toggleChat() {
    chatOpen = !chatOpen;
    chatPanel.classList.toggle('visible', chatOpen);
    document.getElementById('chatIconOpen').style.display = chatOpen ? 'none' : 'block';
    document.getElementById('chatIconClose').style.display = chatOpen ? 'block' : 'none';
    if (chatOpen) chatInput.focus();
}

// Append a message bubble
function appendMsg(text, sender) {
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show typing indicator
function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg typing';
    div.id = 'typingDots';
    div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function hideTyping() {
    const el = document.getElementById('typingDots');
    if (el) el.remove();
}

// Show error hint below messages
function showChatError(msg) {
    chatError.textContent = msg;
    chatError.style.display = 'block';
    setTimeout(() => { chatError.style.display = 'none'; }, 6000);
}

// Parse any n8n response format into a string
function parseResponse(data) {
    if (!data) return null;
    if (typeof data === 'string') return data;

    // Common n8n AI Agent response fields
    if (data.output) return data.output;
    if (data.text) return data.text;
    if (data.message) return data.message;
    if (data.response) return data.response;
    if (data.content) return data.content;
    if (data.answer) return data.answer;
    if (data.result) return typeof data.result === 'string' ? data.result : JSON.stringify(data.result);

    // Array responses
    if (Array.isArray(data)) {
        if (data.length === 0) return "No response received.";
        return parseResponse(data[0]);
    }

    // Fallback
    return JSON.stringify(data);
}

// Send message to n8n
async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    appendMsg(text, 'user');
    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatSendBtn.disabled = true;
    chatError.style.display = 'none';
    showTyping();

    const payload = {
        action: "sendMessage",
        sessionId: chatSessionId,
        chatInput: text
    };

    console.log('[Chat] Sending:', JSON.stringify(payload));

    try {
        const res = await fetch(CONFIG.CHAT_WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        hideTyping();
        console.log('[Chat] Status:', res.status);

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            console.error('[Chat] Error response:', errText);
            appendMsg("Sorry, something went wrong. Please try again.", 'bot');
            showChatError(`Webhook returned ${res.status}. Check your n8n workflow.`);
            return;
        }

        // Parse response — handle both JSON and plain text
        const contentType = res.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            const rawText = await res.text();
            try { data = JSON.parse(rawText); } catch { data = rawText; }
        }

        console.log('[Chat] Response:', data);
        const reply = parseResponse(data);
        appendMsg(reply || "Received an empty response.", 'bot');

    } catch (err) {
        hideTyping();
        console.error('[Chat] Fetch error:', err);
        appendMsg("Could not connect to the assistant.", 'bot');
        showChatError("Network error — check that n8n is running and CORS is enabled.");
    } finally {
        chatSendBtn.disabled = false;
        chatInput.focus();
    }
}

// Enter = send, Shift+Enter = newline
chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
});

// Auto-resize textarea
chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 90) + 'px';
});
