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
    longMessageError: "Too long by {x} characters.",
    waitMessage: "Please wait before submitting again.",
    submittingMessage: "Submitting...",
    linktreeLinks: [
        { href: "https://twitter.com/yourprofile", icon: "https://via.placeholder.com/24x24?text=T", alt: "Twitter" },
        { href: "https://instagram.com/yourprofile", icon: "https://via.placeholder.com/24x24?text=I", alt: "Instagram" },
        { href: "https://facebook.com/yourprofile", icon: "https://via.placeholder.com/24x24?text=F", alt: "Facebook" },
        { href: "https://bsky.app/profile/yourprofile", icon: "https://via.placeholder.com/24x24?text=B", alt: "Bluesky" }
    ],
    confessionsURL: "confessions.json" // URL to the confessions data file
};

/*************************************
 *        DOM ELEMENTS
 *************************************/
const messageInput = document.getElementById('messageInput');
const submitBtn = document.getElementById('submitBtn');
const feedback = document.getElementById('feedback');
const charCounter = document.getElementById('charCounter');
const linktreeContainer = document.getElementById('linktreeContainer');
const confessionFeed = document.getElementById('confessionFeed'); // New element for the feed

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

// Fetch and display confessions on initial load
fetchConfessions();

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
        fetchConfessions(); // Refresh the confession feed after submission
        triggerFireworks();
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
        const excess = userText.length - CONFIG.maxChars;
        feedback.style.color = 'red';
        feedback.textContent = CONFIG.longMessageError.replace('{x}', excess);
        charCounter.classList.add('too-long');
        return;
    } else {
        charCounter.classList.remove('too-long');
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
    if (remaining >= 0) {
        charCounter.textContent = `${remaining} characters remaining`;
        charCounter.classList.remove('too-long');
    } else {
        charCounter.textContent = `Too long by ${-remaining} characters`;
        charCounter.classList.add('too-long');
    }
}

function getDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) return "Android";
    if (/iphone|ipad|ipod/.test(ua)) return "iOS";
    if (/windows/.test(ua)) return "Windows";
    if (/macintosh|mac os x/.test(ua)) return "macOS";
    return "Other";
}

/*************************************
 *        Confession Feed
 *************************************/
function fetchConfessions() {
    fetch(CONFIG.confessionsURL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            displayConfessions(data);
        })
        .catch(error => {
            console.error('Error fetching confessions:', error);
            confessionFeed.innerHTML = 'Failed to load confessions.';
        });
}

function displayConfessions(confessions) {
    // Clear the current feed
    confessionFeed.innerHTML = '';

    if (!Array.isArray(confessions) || confessions.length === 0) {
        confessionFeed.innerHTML = 'No confessions yet. Be the first to confess!';
        return;
    }

    // Sort confessions by date descending
    confessions.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA;
    });

    // Display the top 10 recent confessions
    const recentConfessions = confessions.slice(0, 10);

    recentConfessions.forEach(confession => {
        const confessionDiv = document.createElement('div');
        confessionDiv.classList.add('confession');

        const timestampDiv = document.createElement('div');
        timestampDiv.classList.add('timestamp');
        timestampDiv.textContent = confession.date;

        const textDiv = document.createElement('div');
        textDiv.classList.add('text');
        textDiv.textContent = confession.text;

        confessionDiv.appendChild(timestampDiv);
        confessionDiv.appendChild(textDiv);

        confessionFeed.appendChild(confessionDiv);
    });
}

function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
}

/*************************************
 *        Fireworks Effect
 *************************************/
function triggerFireworks() {
    const container = document.body;
    const fireworks = new Fireworks(container, {
        speed: 2,
        acceleration: 1.05,
        friction: 0.98,
        gravity: 1.5,
        particles: 50,
        trace: 3,
        explosion: 5,
        autoresize: true,
        opacity: 0.8,
        explosionMax: 5,
        brightness: {
            min: 50,
            max: 80
        },
        flickering: 50,
        delay: {
            min: 30,
            max: 50
        },
        rocketsPoint: {
            min: 50,
            max: 50
        },
    });

    fireworks.start();

    // Stop fireworks after 3 seconds
    setTimeout(() => {
        fireworks.stop();
    }, 3000);
}
