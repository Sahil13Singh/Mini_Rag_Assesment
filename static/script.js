// --- State Management ---
let currentTab = 'text';

// --- Sidebar Logic ---
function switchTab(mode) {
    currentTab = mode;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active'); // Fixed event target issue

    if (mode === 'text') {
        document.getElementById('textInputSection').classList.remove('hidden');
        document.getElementById('fileInputSection').classList.add('hidden');
    } else {
        document.getElementById('textInputSection').classList.add('hidden');
        document.getElementById('fileInputSection').classList.remove('hidden');
    }
}

// File Input Display
document.getElementById('fileInput').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || "No file selected";
    document.getElementById('fileName').innerText = fileName;
});

async function handleUpload() {
    const btn = document.getElementById('indexBtn');
    const status = document.getElementById('ingestStatus');
    const formData = new FormData();

    if (currentTab === 'text') {
        const text = document.getElementById('dataInput').value;
        if (!text) return showAlert(status, "Please enter text.", "red");
        formData.append('text', text);
    } else {
        const fileInput = document.getElementById('fileInput');
        if (fileInput.files.length === 0) return showAlert(status, "Please select a file.", "red");
        formData.append('file', fileInput.files[0]);
    }

    btn.classList.add('loading');
    btn.disabled = true;
    status.innerText = "Indexing...";
    status.style.color = "#888";

    try {
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const data = await response.json();
        
        if (response.ok) {
            showAlert(status, `Success! Indexed ${data.chunks} chunks.`, "#10a37f");
            // Clear inputs
            document.getElementById('dataInput').value = "";
            document.getElementById('fileInput').value = "";
            document.getElementById('fileName').innerText = "";
        } else {
            throw new Error(data.error || "Upload failed");
        }
    } catch (error) {
        console.error(error);
        showAlert(status, "Upload failed. See console.", "#ef4444");
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function showAlert(element, msg, color) {
    element.innerText = msg;
    element.style.color = color;
    setTimeout(() => { element.innerText = ""; }, 5000);
}


// --- Chat Logic ---
async function askQuestion() {
    const inputField = document.getElementById('queryInput');
    const query = inputField.value.trim();
    if (!query) return;

    // 1. Add User Message
    addMessageToChat('user', query);
    inputField.value = "";
    inputField.style.height = 'auto'; // Reset height

    // 2. Add AI Placeholder
    const aiMsgId = addMessageToChat('ai', '<span class="typing-indicator">Thinking...</span>');

    try {
        const response = await fetch('/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });
        const data = await response.json();

        // 3. Update AI Message
        updateAiMessage(aiMsgId, data.answer, data.sources);

    } catch (error) {
        console.error(error);
        updateAiMessage(aiMsgId, "Sorry, I encountered an error. Please try again.", []);
    }
}

function addMessageToChat(role, content) {
    const history = document.getElementById('chatHistory');
    const msgDiv = document.createElement('div');
    const msgId = `msg-${Date.now()}`;
    msgDiv.id = msgId;
    msgDiv.className = `message ${role}-message`;
    
    // Icons
    const icon = role === 'ai' ? '<i class="ri-sparkling-fill"></i>' : '<i class="ri-user-3-line"></i>';
    
    msgDiv.innerHTML = `
        <div class="avatar">${icon}</div>
        <div class="message-content">${content}</div>
    `;
    
    history.appendChild(msgDiv);
    history.scrollTop = history.scrollHeight; // Auto scroll
    return msgId;
}

function updateAiMessage(msgId, answer, sources) {
    const msgDiv = document.getElementById(msgId);
    if (!msgDiv) return;

    const contentDiv = msgDiv.querySelector('.message-content');
    
    // Convert newlines to breaks for simple formatting
    let formattedAnswer = answer.replace(/\n/g, '<br>');
    
    // Append Citations if available
    if (sources && sources.length > 0) {
        let citationHtml = '<div class="citations">';
        sources.forEach((src, i) => {
            // Tooltip logic could go here
            const shortText = src.substring(0, 60) + "...";
            citationHtml += `<div class="citation-chip" title="${src}">Source ${i+1}</div>`;
        });
        citationHtml += '</div>';
        formattedAnswer += citationHtml;
    }

    contentDiv.innerHTML = formattedAnswer;
}

// Auto-resize textarea
const tx = document.getElementById("queryInput");
tx.setAttribute("style", "height:" + (tx.scrollHeight) + "px;overflow-y:hidden;");
tx.addEventListener("input", OnInput, false);

function OnInput() {
  this.style.height = 0;
  this.style.height = (this.scrollHeight) + "px";
}

function handleEnter(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        askQuestion();
    }
}