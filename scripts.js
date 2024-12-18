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
    confessionsURL: "confessions.json", // URL to the confessions data file
    confessionsPerPage: 5 // Number of confessions to load per page
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
const loadMoreBtn = document.getElementById('loadMoreBtn'); // Load More button

/*************************************
 *          INITIAL SETUP
 *************************************/
let isCoolingDown = false;
let allConfessions = [];
let currentPage = 0;
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
loadMoreBtn.addEventListener('click', loadMoreConfessions);

/*************************************
 *          FUNCTIONS
 *************************************/

// Attach handleResponse to window for JSONP
window.handleResponse = function(data) {
    submitBtn.disabled = false;
    messageInput.disabled = false;

    if (data.status === "success") {
        feedback.style.color = '#00FFAA';
        feedback.textContent = CONFIG.successMessage;
        messageInput.value = '';
        updateCharCounter();
        startCooldown();
        fetchConfessions(); // Refresh the confession feed after submission
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
            allConfessions = data.sort((a, b) => {
                const dateA = parseDate(a.date);
                const dateB = parseDate(b.date);
                return dateB - dateA;
            });
            currentPage = 0;
            confessionFeed.innerHTML = '';
            loadMoreConfessions();
        })
        .catch(error => {
            console.error('Error fetching confessions:', error);
            confessionFeed.innerHTML = 'Failed to load confessions.';
            loadMoreBtn.style.display = 'none';
        });
}

function loadMoreConfessions() {
    const start = currentPage * CONFIG.confessionsPerPage;
    const end = start + CONFIG.confessionsPerPage;
    const confessionsToLoad = allConfessions.slice(start, end);

    confessionsToLoad.forEach(confession => {
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

    currentPage++;

    if (currentPage * CONFIG.confessionsPerPage >= allConfessions.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'block';
    }
}

function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
}

// Matrix-like background with words from confessions.json

const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

// Resize the canvas to fill browser window dynamically
window.addEventListener('resize', resizeCanvas, false);

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();

// Load confessions.json and extract words
let words = [];

fetch('confessions.json')
    .then(response => response.json())
    .then(data => {
        data.forEach(confession => {
            // Split confession text into words and filter out short words
            const confessionWords = confession.text.split(' ').filter(word => word.length > 2);
            words = words.concat(confessionWords);
        });
        startMatrix();
    })
    .catch(error => console.error('Error loading confessions:', error));

const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = [];

// Initialize drops
for (let x = 0; x < columns; x++) {
    drops[x] = Math.random() * canvas.height;
}

function startMatrix() {
    setInterval(draw, 50);
}

function draw() {
    // Black BG with opacity to create trail
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set text color to red and font
    ctx.fillStyle = '#FF0000';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        // Pick a random word
        const word = words[Math.floor(Math.random() * words.length)];
        // x = i * fontSize, y = drops[i]
        ctx.fillText(word, i * fontSize, drops[i]);

        // Reset to top if it goes beyond canvas height
        if (drops[i] > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        // Increment y coordinate
        drops[i] += fontSize;
    }
}
