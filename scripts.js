/*************************************
 *           CONFIGURATION
 *************************************/
const CONFIG = {
    endpointURL: "https://script.google.com/macros/s/AKfycbzWBofHsiPZ8--iZ84lkiawx5Wpuliw7YLkcvQIOz9eoOoQmtoDrAkAl_htWJWvbGQSqA/exec",
    minChars: 10,
    maxChars: 280,
    cooldownTime: 10000,
    successMessage: "Message submitted successfully!",
    shortMessageError: "Your entry is too short! Min 10 chars.",
    longMessageError: "Your entry is too long! Max 250 chars.",
    waitMessage: "Please wait before submitting again.",
    submittingMessage: "Submitting...",
    linktreeLinks: [
        { href: "https://twitter.com/yourprofile", icon: "https://via.placeholder.com/24x24?text=T", alt: "Twitter" },
        { href: "https://instagram.com/yourprofile", icon: "https://via.placeholder.com/24x24?text=I", alt: "Instagram" },
        { href: "https://facebook.com/yourprofile", icon: "https://via.placeholder.com/24x24?text=F", alt: "Facebook" },
        { href: "https://bsky.app/profile/yourprofile", icon: "https://via.placeholder.com/24x24?text=B", alt: "Bluesky" }
    ]
};

/*************************************
 *        DOM ELEMENTS
 *************************************/
const messageInput = document.getElementById('messageInput');
const submitBtn = document.getElementById('submitBtn');
const feedback = document.getElementById('feedback');
const charCounter = document.getElementById('charCounter');
const linktreeContainer = document.getElementById('linktreeContainer');

/*************************************
 *          INITIAL SETUP
 *************************************/
let isCoolingDown = false;
updateCharCounter();

// Build linktree from config
CONFIG.linktreeLinks.forEach(link => {
    const a = document.createElement('a');
    a.href = link.href;
    a.target = "_blank";
    const img = document.createElement('img');
    img.src = link.icon;
    img.alt = link.alt;
    a.appendChild(img);
    linktreeContainer.appendChild(a);
});

/*************************************
 *          EVENT LISTENERS
 *************************************/
submitBtn.addEventListener('click', submitMessage);
messageInput.addEventListener('keydown', handleKeydown);
messageInput.addEventListener('input', handleInput);
messageInput.addEventListener('paste', handlePaste);

/*************************************
 *          FUNCTIONS
 *************************************/
function handleResponse(data) {
    submitBtn.disabled = false;
    messageInput.disabled = false;

    if (data.status === "success") {
        feedback.style.color = '#00FFAA';
        feedback.textContent = CONFIG.successMessage;
        messageInput.value = '';
        updateCharCounter();
        startCooldown();
    } else {
        // Server reported an error
        feedback.style.color = 'red';
        feedback.textContent = data.error || "Server error.";
    }
}

function submitMessage() {
    if (isCoolingDown) {
        feedback.style.color = 'red';
        feedback.textContent = CONFIG.waitMessage;
        return;
    }

    const userText = messageInput.value.trim();

    if (userText.length < CONFIG.minChars) {
        feedback.style.color = 'red';
        feedback.textContent = CONFIG.shortMessageError;
        return;
    }

    if (userText.length > CONFIG.maxChars) {
        feedback.style.color = 'red';
        feedback.textContent = CONFIG.longMessageError;
        return;
    }

    feedback.style.color = '#fff';
    feedback.textContent = CONFIG.submittingMessage;
    submitBtn.disabled = true;
    messageInput.disabled = true;

    // Determine simplified device string
    const device = getDeviceType();

    // Create a script tag for JSONP
    const script = document.createElement('script');
    script.src = `${CONFIG.endpointURL}?callback=handleResponse&text=${encodeURIComponent(userText)}&device=${encodeURIComponent(device)}`;
    document.body.appendChild(script);
}

function startCooldown() {
    isCoolingDown = true;
    submitBtn.disabled = true;
    messageInput.disabled = true;
    setTimeout(() => {
        isCoolingDown = false;
        submitBtn.disabled = false;
        messageInput.disabled = false;
        feedback.textContent = "";
    }, CONFIG.cooldownTime);
}

function handleKeydown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitMessage();
    }
}

function handlePaste(e) {
    e.preventDefault();
    let pastedText = (e.clipboardData || window.clipboardData).getData('text');
    // Replace newlines with spaces
    pastedText = pastedText.replace(/\r?\n|\r/g, ' ');
    document.execCommand('insertText', false, pastedText);
}

function handleInput() {
    // No newline allowed, remove them if typed by other means
    messageInput.value = messageInput.value.replace(/\r?\n|\r/g, ' ');
    updateCharCounter();
}

function updateCharCounter() {
    const length = messageInput.value.trim().length;
    const remaining = CONFIG.maxChars - length;
    charCounter.textContent = `${remaining} characters remaining`;
}

function getDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) return "Android";
    if (/iphone|ipad|ipod/.test(ua)) return "iOS";
    if (/windows/.test(ua)) return "Windows";
    if (/macintosh|mac os x/.test(ua)) return "macOS";
    return "Other";
}
