// ---------- mobile viewport height fix ----------
// Many mobile browsers (in-app browsers, some Android WebViews/Silk, older
// Safari) compute 100vh/100dvh unreliably — the address bar height gets
// included/excluded inconsistently, which is a very common cause of a
// squished or blank-looking layout on phones. We measure the *real*
// available height in JS and expose it as --vh, then use it as a fallback
// in CSS (calc(var(--vh, 1vh) * 100)) alongside 100dvh.
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setViewportHeight();
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', setViewportHeight);

// Keep the composer visible above the on-screen keyboard on mobile browsers
// that support the visualViewport API (iOS Safari, Chrome Android).
if (window.visualViewport) {
    const syncKeyboardInset = () => {
        const inset = Math.max(0, window.innerHeight - window.visualViewport.height);
        document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
    };
    window.visualViewport.addEventListener('resize', syncKeyboardInset);
    window.visualViewport.addEventListener('scroll', syncKeyboardInset);
}

// ---------- element refs ----------
const app = document.querySelector('.app');
const sidebar = document.getElementById('sidebar');
const collapseBtn = document.getElementById('collapseBtn');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const newChatBtn = document.getElementById('newChatBtn');
const chatList = document.getElementById('chatList');
const chatArea = document.getElementById('chatArea');
const welcomeScreen = document.getElementById('welcomeScreen');
const thread = document.getElementById('thread');
const composerForm = document.getElementById('composerForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const searchInput = document.getElementById('searchInput');
const themeToggle = document.getElementById('themeToggle');
const suggestionCards = document.querySelectorAll('.suggestion-card');
const modelSwitcher = document.getElementById('modelSwitcher');
const topbarModelSelect = document.getElementById('topbarModelSelect');
const modelLabel = document.getElementById('modelLabel');
const profileBtn = document.getElementById('profileBtn');
const profilePopup = document.getElementById('profilePopup');
const attachBtn = document.getElementById('attachBtn');
const shareBtn = document.getElementById('shareBtn');
const fileInput = document.getElementById('fileInput');
const attachmentPreview = document.getElementById('attachmentPreview');
const micBtn = document.getElementById('micBtn');
const dragOverlay = document.getElementById('dragOverlay');
const uploadProgress = document.getElementById('uploadProgress');

// Settings Modal elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModalOverlay = document.getElementById('settingsModalOverlay');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// ---------- global state ----------
const USER_INITIALS = document.body.dataset.userInitials || 'U';
let currentChatId = null;
let currentModel = 'groq/compound-mini'; // Default model
let attachedFile = null;

/**
 * Applies the theme ('light' or 'dark') from localStorage or server-rendered data.
 * This function should be placed in a script tag in the <head> of each page for flicker-free theme loading.
 */
function applyInitialTheme() {
    try {
        // 1. Check localStorage first for instant theme application
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            document.body.dataset.theme = storedTheme;
            document.body.classList.toggle('light', storedTheme === 'light');
            return;
        }

        // 2. Fallback to server-rendered theme for logged-in users
        const serverTheme = document.body.dataset.theme;
        if (serverTheme) {
            localStorage.setItem('theme', serverTheme); // Save it for next time
            document.body.classList.toggle('light', serverTheme === 'light');
        }
    } catch (e) {
        console.error("Could not apply theme:", e);
    }
}


/**
 * Sets the initial state of the UI on page load.
 */
function initializeUI() {
    // Update settings modal theme buttons based on current theme
    const currentTheme = document.body.dataset.theme || 'dark';
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
    const selectedOption = topbarModelSelect.options[topbarModelSelect.selectedIndex] || topbarModelSelect.options[0];
    if (selectedOption) {
        currentModel = selectedOption.value || 'groq/compound-mini';
        topbarModelSelect.value = currentModel;
        updateModelLabel(selectedOption.textContent.trim());
    }
}

function updateModelLabel(labelText = '') {
    if (!modelLabel) return;
    const selectedOption = topbarModelSelect.options[topbarModelSelect.selectedIndex] || topbarModelSelect.options[0];
    const text = labelText || (selectedOption ? selectedOption.textContent.trim() : 'Select model');
    modelLabel.textContent = text;
}
// ---------- sidebar collapse (desktop) / open (mobile) ----------
collapseBtn.addEventListener('click', () => {
    if (window.innerWidth <= 860) {
        app.classList.toggle('sidebar-open');
    } else {
        app.classList.toggle('collapsed');
    }
});
mobileMenuBtn.addEventListener('click', () => app.classList.toggle('sidebar-open'));

// Tap outside the drawer (on the dim backdrop) to close it on mobile.
if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => app.classList.remove('sidebar-open'));
}

// Close the drawer with Escape too (nice on tablets with keyboards).
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && app.classList.contains('sidebar-open')) {
        app.classList.remove('sidebar-open');
    }
});

// ---------- theme toggle ----------
themeToggle.addEventListener('click', async () => {
    const isLight = document.body.classList.toggle('light');
    const newTheme = isLight ? 'light' : 'dark';

    // Save to localStorage for instant loading on other pages
    localStorage.setItem('theme', newTheme);

    // Update the data attribute for consistency
    document.body.dataset.theme = newTheme;

    // Save the theme preference to the backend
    try {
        await fetch('/api/user/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: newTheme })
        });
    } catch (error) {
        console.error("Failed to save theme preference:", error);
    }
});

// ---------- Model Selector ----------
topbarModelSelect.addEventListener('change', () => {
    const selectedOption = topbarModelSelect.options[topbarModelSelect.selectedIndex];

    if (!selectedOption) return;

    currentModel = selectedOption.value || 'groq/compound-mini';
    updateModelLabel(selectedOption.textContent.trim());
    console.log(`Model changed to: ${currentModel}`);
});

// ---------- profile menu popup ----------
profileBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent the window click listener from closing it immediately
    profilePopup.classList.toggle('open');
    profileBtn.classList.toggle('open');
});

// Close popup when clicking outside
window.addEventListener('click', (e) => {
    if (profilePopup.classList.contains('open') && !profilePopup.contains(e.target)) {
        profilePopup.classList.remove('open');
        profileBtn.classList.remove('open');
    }
});

// ---------- Settings Modal Logic ----------
if (settingsBtn && settingsModalOverlay && closeSettingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        settingsModalOverlay.style.display = 'flex';
        profilePopup.classList.remove('open'); // Close profile popup
        profileBtn.classList.remove('open');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModalOverlay.style.display = 'none';
    });

    settingsModalOverlay.addEventListener('click', (e) => {
        if (e.target === settingsModalOverlay) {
            settingsModalOverlay.style.display = 'none';
        }
    });

    // Clear chat history button
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to permanently delete all your chats? This cannot be undone.')) {
                try {
                    const response = await fetch('/api/chats/clear', { method: 'POST' });
                    if (!response.ok) throw new Error('Failed to clear history.');

                    // Reset UI
                    chatList.innerHTML = '<p class="list-label" style="text-align: center; padding: 20px 0; color: var(--ink-400);">No recent chats</p>';
                    resetToWelcome(true);
                    settingsModalOverlay.style.display = 'none'; // Close modal
                    showToast("Chat history cleared successfully!");

                } catch (error) {
                    console.error("Error clearing chat history:", error);
                    showToast("Could not clear chat history.", "error");
                }
            }
        });
    }

    // Theme selection inside modal
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', async () => {
            const newTheme = btn.dataset.theme;
            document.body.classList.toggle('light', newTheme === 'light');
            document.body.dataset.theme = newTheme;

            // Save to localStorage for instant loading on other pages
            localStorage.setItem('theme', newTheme);

            // Update active state
            document.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Save to backend
            try {
                await fetch('/api/user/theme', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ theme: newTheme })
                });
            } catch (error) { console.error("Failed to save theme preference:", error); }
        });
    });

    // Font size selection inside modal
    document.querySelectorAll('input[name="modal_font_size"]').forEach(radio => {
        radio.addEventListener('change', async () => {
            const newSize = radio.value;
            document.body.dataset.fontSize = newSize;

            // Save to backend
            try {
                await fetch('/api/user/appearance', { // We need a new endpoint for this
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ font_size: newSize })
                });
                showToast("Font size updated!");
            } catch (error) {
                console.error("Failed to save font size:", error);
                showToast("Error saving font size.", "error");
            }
        });
    });
}

// ---------- chat search/filter ----------
searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase();
    const chatItems = chatList.querySelectorAll('.chat-item');
    const noChatsMessage = chatList.querySelector('p.list-label');

    chatItems.forEach(item => {
        const title = item.querySelector('.chat-title').textContent.toLowerCase();
        const isVisible = title.includes(searchTerm);
        item.style.display = isVisible ? 'flex' : 'none';
    });
});

// ---------- File Attachment ----------
attachBtn.addEventListener('click', () => {
    fileInput.click();
});

function handleFile(file) {
    // Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        showToast("File is too large. Max size is 10MB.");
        fileInput.value = ''; // Reset the input
        return;
    }

    attachedFile = file;
    showAttachmentPreview(file.name);
}

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) handleFile(file);
});

function showAttachmentPreview(fileName) {
    attachmentPreview.innerHTML = `
        <span class="attachment-preview-name">${escapeHtml(fileName)}</span>
        <button class="attachment-preview-remove" title="Remove file">
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;
    attachmentPreview.style.display = 'flex';

    attachmentPreview.querySelector('.attachment-preview-remove').addEventListener('click', () => {
        removeAttachment();
    });
}

function removeAttachment() {
    attachedFile = null;
    fileInput.value = ''; // Reset the file input
    attachmentPreview.style.display = 'none';
    attachmentPreview.innerHTML = '';
}

// ---------- Drag and Drop File Upload ----------
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

['dragenter', 'dragover'].forEach(eventName => {
    document.body.addEventListener(eventName, () => {
        // Do not show overlay if a chat item is being dragged (future feature?)
        // or if something from outside the window is dragged that isn't a file.
        dragOverlay.classList.add('visible');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, (e) => {
        // Add a small delay on dragleave to prevent flickering when moving over child elements
        if (e.type === 'dragleave' && e.relatedTarget !== null) return;
        dragOverlay.classList.remove('visible');
    });
});

document.body.addEventListener('drop', (e) => {
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
        handleFile(droppedFiles[0]); // Handle the first dropped file
    }
});

// ---------- Voice input button ----------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isListening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('active');
        micBtn.title = "Stop listening";
    };

    recognition.onend = () => {
        isListening = false;
        micBtn.classList.remove('active');
        micBtn.title = "Use voice";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        messageInput.value = transcript;
        autoGrow(); // Update textarea height and send button state
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        showToast(`Speech error: ${event.error}`);
    };

} else {
    micBtn.style.display = 'none'; // Hide button if API is not supported
}

micBtn.addEventListener('click', () => {
    if (!SpeechRecognition) return;

    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
});


// ---------- textarea auto-grow + send button state ----------
function autoGrow() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    sendBtn.disabled = messageInput.value.trim().length === 0;
}
messageInput.addEventListener('input', autoGrow);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        composerForm.requestSubmit();
    }
});

function resetToWelcome(resetChatId = true) {
    thread.innerHTML = '';
    thread.style.display = 'none';
    removeAttachment();
    if (resetChatId) {
        currentChatId = null;
    }
    shareBtn.style.display = 'none';
    welcomeScreen.style.display = 'block';
    document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
}

// ---------- suggestion cards prefill ----------
suggestionCards.forEach(card => {
    card.addEventListener('click', () => {
        const title = card.querySelector('.s-title').textContent;
        const sub = card.querySelector('.s-sub').textContent;
        messageInput.value = `${title} — ${sub}`;
        autoGrow();
        messageInput.focus();
        composerForm.requestSubmit();
    });
});

// ---------- new chat ----------
newChatBtn.addEventListener('click', resetToWelcome);

// ---------- chat item click (demo) ----------
chatList.addEventListener('click', (e) => {
    const item = e.target.closest('.chat-item');
    if (!item) return;

    const chatId = item.dataset.id;

    // Handle clicks on action buttons
    if (e.target.closest('.rename-btn')) {
        handleRename(item, chatId);
        return;
    }

    if (e.target.closest('.delete-btn')) {
        handleDelete(item, chatId);
        return;
    }

    // If clicking on the item itself (not buttons), load the chat
    loadChat(item, chatId);
});

thread.addEventListener('click', (e) => {
    const regenerateBtn = e.target.closest('.regenerate-btn');
    if (regenerateBtn) handleRegenerate(regenerateBtn);

    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) handleCopy(copyBtn);

    const goodBtn = e.target.closest('.good-btn');
    if (goodBtn) handleRating(goodBtn, 'good');

    const badBtn = e.target.closest('.bad-btn');
    if (badBtn) handleRating(badBtn, 'bad');



});


async function loadChat(item, chatId) {
    // Prevent re-loading the same chat
    if (chatId === currentChatId) return;

    document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    currentChatId = chatId;

    shareBtn.style.display = 'flex'; // Show the share button
    welcomeScreen.style.display = 'none';
    thread.innerHTML = '<div class="msg bot"><div class="msg-body"><div class="typing"><span></span><span></span><span></span></div></div></div>';
    thread.style.display = 'flex';

    const messages = await fetchChatMessages(currentChatId);
    thread.innerHTML = ''; // Clear loading indicator
    messages.forEach(msg => {
        // The API returns 'assistant' but our function uses 'bot'
        appendMessage(msg.role === 'assistant' ? 'bot' : 'user', msg.content);
    });

    if (window.innerWidth <= 860) app.classList.remove('sidebar-open');
}

shareBtn.addEventListener('click', async () => {
    if (!currentChatId) {
        showToast("Please select a chat to share.");
        return;
    }

    // Show a temporary loading state on the button
    shareBtn.disabled = true;

    try {
        const response = await fetch(`/api/chat/${currentChatId}/share`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to create share link.');

        const data = await response.json();
        if (!data.success || !data.share_url) {
            throw new Error(data.error || 'Unknown error creating share link');
        }

        const shareUrl = data.share_url;
        const activeChatItem = document.querySelector('.chat-item.active .chat-title');
        const chatTitle = activeChatItem ? activeChatItem.textContent : 'ConvAI Conversation';

        // Use Web Share API if available (for mobile)
        if (navigator.share) {
            await navigator.share({
                title: chatTitle,
                text: 'Check out this conversation from ConvAI:',
                url: shareUrl,
            });
        } else {
            // Fallback for desktop: copy to clipboard
            await navigator.clipboard.writeText(shareUrl);
            showToast("Share link copied to clipboard!");
        }
    } catch (error) {
        console.error("Error sharing chat:", error);
        showToast(`Could not create share link: ${error.message}`, 'error');
    } finally {
        shareBtn.disabled = false; // Re-enable the button
    }
});

function handleRename(item, chatId) {
    const titleSpan = item.querySelector('.chat-title');
    const currentTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'rename-input';
    input.value = currentTitle;

    titleSpan.replaceWith(input);
    input.focus();
    input.select();

    const saveRename = async () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
            // Optimistically update UI
            const newTitleSpan = document.createElement('span');
            newTitleSpan.className = 'chat-title';
            newTitleSpan.textContent = newTitle;
            input.replaceWith(newTitleSpan);

            // Send request to server
            await fetch(`/api/chat/${chatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle }),
            });
        } else {
            // Restore original title if input is empty or unchanged
            input.replaceWith(titleSpan);
        }
    };

    input.addEventListener('blur', saveRename);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveRename();
        } else if (e.key === 'Escape') {
            input.replaceWith(titleSpan);
        }
    });
}

async function handleDelete(item, chatId) {
    if (confirm('Are you sure you want to delete this chat?')) {
        // Optimistically remove from UI
        item.remove();
        if (chatList.children.length === 0) {
            chatList.innerHTML = '<p class="list-label" style="text-align: center; padding: 20px 0; color: var(--ink-400);">No recent chats</p>';
        }

        // If the deleted chat was the active one, reset the view
        if (chatId === currentChatId) {
            resetToWelcome(false); // Pass false to prevent resetting currentChatId
        }

        // Send request to server
        await fetch(`/api/chat/${chatId}`, { method: 'DELETE' });
    }
}

async function handleRegenerate(button) {
    const botMsgElement = button.closest('.msg.bot');
    if (!botMsgElement) return;

    // Find the last user message before this bot message
    let lastUserMsgElement = botMsgElement.previousElementSibling;
    while (lastUserMsgElement && !lastUserMsgElement.classList.contains('user')) {
        lastUserMsgElement = lastUserMsgElement.previousElementSibling;
    }

    if (!lastUserMsgElement) {
        console.error("Could not find the preceding user message to regenerate from.");
        return;
    }

    // Extract the original user message text
    const userMessageText = lastUserMsgElement.querySelector('.msg-text').textContent;

    // Remove the bot message that we are regenerating
    botMsgElement.remove();

    // Show typing indicator
    const typingEl = appendTyping();
    chatArea.scrollTop = chatArea.scrollHeight;

    try {
        console.log(`Regenerating response with model: ${currentModel}`);
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessageText,
                chat_id: currentChatId,
                model: currentModel
            }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        typingEl.remove();
        console.log(`Response received, generated by: ${data.model_used}`);
        appendMessage('bot', data.reply);
    } catch (error) {
        console.error("Error regenerating response:", error);
        typingEl.remove();
        appendMessage('bot', "Sorry, I couldn't get a response. Please try again.");
    }
}

function handleCopy(button) {
    const msgBody = button.closest('.msg-body');
    const msgText = msgBody.querySelector('.msg-text');
    if (!msgText) return;

    // Use textContent to get the raw text without HTML tags
    navigator.clipboard.writeText(msgText.textContent).then(() => {
        const originalIcon = button.innerHTML;
        // Simple visual feedback: checkmark icon
        button.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';
        setTimeout(() => {
            button.innerHTML = originalIcon;
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Could not copy text.');
    });
}

async function handleRating(button, rating) {
    const msgBody = button.closest('.msg-body');
    const msgText = msgBody.querySelector('.msg-text');
    if (!msgText || !currentChatId) return;

    const messageContent = msgText.textContent;

    try {
        await fetch('/api/chat/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: currentChatId,
                message_content: messageContent,
                rating: rating
            }),
        });

        // Visual feedback: disable both rating buttons and highlight the clicked one
        const actions = button.closest('.msg-actions');
        actions.querySelector('.good-btn').disabled = true;
        actions.querySelector('.bad-btn').disabled = true;
        button.classList.add('rated');

        showToast("Thanks for your feedback!");

    } catch (error) { console.error('Error submitting rating:', error); }
}

// ---------- sending messages (demo / UI-only) ----------
composerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    welcomeScreen.style.display = 'none';
    thread.style.display = 'flex';

    appendMessage('user', text);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;
    const isNewChat = !currentChatId;

    const typingEl = appendTyping();
    chatArea.scrollTop = chatArea.scrollHeight;

    const formData = createFormData(text);
    const xhr = new XMLHttpRequest();

    xhr.open('POST', '/api/chat', true);

    // --- Progress Event ---
    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && attachedFile) {
            const percentComplete = (event.loaded / event.total) * 100;
            uploadProgress.style.display = 'block';
            uploadProgress.querySelector('.upload-progress-bar').style.width = percentComplete + '%';
        }
    };

    // --- Upload Complete ---
    xhr.onload = () => {
        typingEl.remove();

        // Hide progress bar on completion
        if (attachedFile) {
            uploadProgress.style.display = 'none';
            uploadProgress.querySelector('.upload-progress-bar').style.width = '0%';
        }

        try {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);

                // If a file was attached, it's now processed, so we can clear it from the UI
                if (attachedFile) {
                    removeAttachment();
                }

                console.log(`Response received, generated by: ${data.model_used}`);
                appendMessage('bot', data.reply);

                // If it was a new chat, update the state and sidebar
                if (isNewChat && data.chat_id) {
                    currentChatId = data.chat_id;
                    addChatToSidebar(data.chat_id, data.title, true);
                } else if (data.title_updated) {
                    updateSidebarChatTitle(currentChatId, data.title);
                } else if (!isNewChat) {
                    moveChatToTop(currentChatId);
                }
            } else {
                // Handle server-side errors (e.g., 429, 413, 500)
                const errorData = JSON.parse(xhr.responseText);
                throw new Error(errorData.reply || `HTTP error! status: ${xhr.status}`);
            }
        } catch (error) {
            console.error("Error processing chat response:", error);
            appendMessage('bot', error.message || "Sorry, I couldn't get a response. Please try again.");
        }
    };

    // --- Upload Error ---
    xhr.onerror = () => {
        typingEl.remove();
        if (attachedFile) {
            uploadProgress.style.display = 'none';
            uploadProgress.querySelector('.upload-progress-bar').style.width = '0%';
        }
        console.error("XHR request failed");
        appendMessage('bot', "A network error occurred. Please check your connection and try again.");
    };

    console.log(`Sending message with model: ${currentModel}`);
    xhr.send(formData);
});

function createFormData(text) {
    const formData = new FormData();
    formData.append('message', text);
    formData.append('model', currentModel || 'groq/compound-mini');
    if (currentChatId) formData.append('chat_id', currentChatId);
    if (attachedFile) formData.append('file', attachedFile);
    return formData;
}

function appendMessage(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `msg ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? USER_INITIALS.substring(0, 1) : 'C';

    const body = document.createElement('div');
    body.className = 'msg-body';

    const name = document.createElement('div');
    name.className = 'msg-name';
    name.textContent = role === 'user' ? 'You' : 'ConvAI';

    const textEl = document.createElement('div');
    textEl.className = 'msg-text';

    if (role === 'bot') {
        // Parse markdown and sanitize it for security
        textEl.innerHTML = DOMPurify.sanitize(marked.parse(text));
    } else {
        textEl.innerHTML = `<p>${escapeHtml(text)}</p>`;
    }

    body.appendChild(name);
    body.appendChild(textEl);

    if (role === 'bot') {
        const actions = document.createElement('div');
        actions.className = 'msg-actions';
        actions.innerHTML = `
      <button class="copy-btn" title="Copy"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg></button>
      <button class="good-btn" title="Good response"><svg viewBox="0 0 24 24"><path d="M7 11v8a1 1 0 001 1h7.5a2 2 0 002-1.7l1.1-7a2 2 0 00-2-2.3H13l.7-4.2a1.5 1.5 0 00-2.7-1.1L7 11z"/></svg></button>
      <button class="bad-btn" title="Bad response"><svg viewBox="0 0 24 24"><path d="M17 13V5a1 1 0 00-1-1H8.5a2 2 0 00-2 1.7l-1.1 7a2 2 0 002 2.3H11l-.7 4.2a1.5 1.5 0 002.7 1.1L17 13z"/></svg></button>
      <button class="regenerate-btn" title="Regenerate"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-3-6.7M21 4v5h-5"/></svg></button>
    `;
        body.appendChild(actions);
    }

    wrap.appendChild(avatar);
    wrap.appendChild(body);
    thread.appendChild(wrap);
    chatArea.scrollTop = chatArea.scrollHeight; // Scroll to bottom
    return wrap;
}

function appendTyping() {
    const wrap = document.createElement('div');
    // Added a specific class for easier selection
    wrap.className = 'msg bot typing-indicator';
    wrap.innerHTML = `
    <div class="msg-avatar">C</div>
    <div class="msg-body">
      <div class="msg-name">ConvAI</div>
      <div class="typing"><span></span><span></span><span></span></div>
    </div>
  `;
    thread.appendChild(wrap);
    chatArea.scrollTop = chatArea.scrollHeight; // Scroll to bottom
    return wrap;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function loadChatHistory() {
    try {
        const response = await fetch('/api/chats');
        if (!response.ok) throw new Error('Failed to load chat history');
        const chats = await response.json();

        if (chats.length > 0) {
            chatList.innerHTML = ''; // Clear "No recent chats"
            chats.forEach(chat => addChatToSidebar(chat.id, chat.title));
        } else {
            chatList.innerHTML = '<p class="list-label" style="text-align: center; padding: 20px 0; color: var(--ink-400);">No recent chats</p>';
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        chatList.innerHTML = '<p class="list-label" style="text-align: center; padding: 20px 0; color: var(--danger);">Could not load chats</p>';
    }
}

function addChatToSidebar(id, title, isActive = false) {
    const noChatsMessage = chatList.querySelector('p.list-label');
    if (noChatsMessage) {
        noChatsMessage.remove();
    }

    const chatItem = document.createElement('button');
    chatItem.className = 'chat-item';
    chatItem.dataset.id = id;
    chatItem.innerHTML = `
        <span class="chat-title">${escapeHtml(title)}</span>
        <div class="chat-item-actions">
            <button class="rename-btn" title="Rename">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
            <button class="delete-btn" title="Delete">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
            </button>
        </div>
    `;

    if (isActive) {
        document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
        chatItem.classList.add('active');
    }

    chatList.prepend(chatItem); // Add new chats to the top
}

function updateSidebarChatTitle(chatId, newTitle) {
    const chatItem = chatList.querySelector(`.chat-item[data-id="${chatId}"]`);
    if (chatItem) {
        const titleSpan = chatItem.querySelector('.chat-title');
        if (titleSpan) titleSpan.textContent = newTitle;
    }
}

function moveChatToTop(chatId) {
    const chatItem = chatList.querySelector(`.chat-item[data-id="${chatId}"]`);
    if (chatItem) {
        // Using prepend moves the element to the top of its parent
        chatList.prepend(chatItem);
    }
}


async function fetchChatMessages(chatId) {
    const response = await fetch(`/api/chat/${chatId}`);
    if (!response.ok) {
        showToast('Could not load chat messages.');
        return [];
    }
    return await response.json();
}

function showToast(message) {
    // Remove any existing toasts to prevent overlap
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10); // Small delay to allow CSS transition to trigger

    // Animate out and remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}
// init
thread.style.display = 'none';
initializeUI();
applyInitialTheme();
loadChatHistory();

// --- Global Auth Form Loader ---
// This script will run on any page that includes script.js
// It finds all forms with the class 'auth-form' and adds a loading state to their submit button.
document.addEventListener('DOMContentLoaded', () => {
    const authForms = document.querySelectorAll('.auth-form');
    authForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const submitBtn = form.querySelector('.auth-btn');
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        });
    });

    // --- Profile Page Form Loader ---
    if (document.body.classList.contains('page-profile')) {
        const profileForms = document.querySelectorAll('.profile-form form');
        profileForms.forEach(form => {
            form.addEventListener('submit', (e) => {
                const submitBtn = form.querySelector('.submit-btn, .danger-btn');
                if (!submitBtn) return;

                // Special confirmation for the delete account form
                if (submitBtn.classList.contains('danger-btn') && form.action.includes('/delete-account')) {
                    if (!confirm('Are you sure you want to permanently delete your account? This will erase all your data and cannot be undone.')) {
                        e.preventDefault(); // Stop the form submission if user cancels
                        return;
                    }
                }

                // If we reach here, either it's not the delete form or the user confirmed.
                // Show the loader.
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
            });
        });
    }
});