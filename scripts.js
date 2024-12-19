/*************************************
 *           CONFIGURATION
 *************************************/
const CONFIG = {
    endpointURL: "https://script.google.com/macros/s/AKfycbzYHAReKAfu3oRkqSMjQye_xes4PGR8hklRVSzOVbjidOOZ7t8hiepkQsXvh0KtBuciSQ/exec",
    minChars: 10,
    maxChars: 280,
    cooldownTime: 10000, // 10 seconds
    successMessage: "Confession submitted successfully!",
    shortMessageError: "Your confession is too short! Minimum 10 characters.",
    longMessageError: "Your confession is too long by {x} characters.",
    waitMessage: "Please wait before submitting another confession.",
    submittingMessage: "Submitting...",
    linktreeLinks: [
        { href: "https://twitter.com/yourprofile", icon: "https://via.placeholder.com/24x24?text=T", alt: "Twitter" },
        { href: "https://instagram.com/yourprofile", icon: "https://via.placeholder.com/24x24?text=I", alt: "Instagram" },
        { href: "https://facebook.com/yourprofile", icon: "https://via.placeholder.com/24x24?text=F", alt: "Facebook" },
        { href: "https://bsky.app/profile/yourprofile", icon: "https://via.placeholder.com/24x24?text=B", alt: "Bluesky" }
    ],
    confessionsURL: "confessions.json",
    confessionsPerPage: 5
};

/*************************************
 *        DOM ELEMENTS
 *************************************/
const messageInput = document.getElementById('messageInput');
const submitBtn = document.getElementById('submitBtn');
const feedback = document.getElementById('feedback');
const charCounter = document.getElementById('charCounter');
const linktreeContainer = document.getElementById('linktreeContainer');
const confessionFeed = document.getElementById('confessionFeed');
const loadMoreBtn = document.getElementById('loadMoreBtn');

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

/* Escape Special Characters */
function escapeSpecialChars(str) {
    return str
        .replace(/\\/g, '\\\\')   // Escape backslashes
        .replace(/"/g, '\\"')     // Escape double quotes
        .replace(/'/g, "\\'")     // Escape single quotes
        .replace(/\n/g, '\\n')    // Escape newlines
        .replace(/\r/g, '\\r')    // Escape carriage returns
        .replace(/</g, '&lt;')    // Escape less-than
        .replace(/>/g, '&gt;')    // Escape greater-than
        .replace(/&/g, '&amp;');  // Escape ampersand
}

/* Handle JSONP Response */
window.handleResponse = function(data) {
    submitBtn.disabled = false;

    if (data.status === "success") {
        feedback.style.color = '#00FFAA';
        feedback.textContent = CONFIG.successMessage;
        messageInput.value = '';
        updateCharCounter();
        startCooldown();
        fetchConfessions(); // Refresh the confession feed after submission
    } else {
        // Server reported an error
        feedback.style.color = '#FF0000';
        feedback.textContent = data.error || "Server error.";
    }
}

/* Generate or Retrieve userId */
function getUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }
    return userId;
}

/* Submit Confession */
function submitMessage() {
    if (isCoolingDown) {
        feedback.style.color = '#FF0000';
        feedback.textContent = CONFIG.waitMessage;
        submitBtn.title = CONFIG.waitMessage; // Set tooltip
        return;
    }

    let userText = messageInput.value.trim();

    if (userText.length < CONFIG.minChars) {
        feedback.style.color = '#FF0000';
        feedback.textContent = CONFIG.shortMessageError;
        return;
    }

    if (userText.length > CONFIG.maxChars) {
        const excess = userText.length - CONFIG.maxChars;
        feedback.style.color = '#FF0000';
        feedback.textContent = CONFIG.longMessageError.replace('{x}', excess);
        charCounter.classList.add('too-long');
        return;
    } else {
        charCounter.classList.remove('too-long');
    }

    // Sanitize the user input
    userText = escapeSpecialChars(userText);

    feedback.style.color = '#fff';
    feedback.textContent = CONFIG.submittingMessage;
    submitBtn.disabled = true;

    // Determine device type
    const device = getDeviceType();

    // Set tooltip to submitting
    submitBtn.title = CONFIG.submittingMessage;

    // Retrieve or generate userId
    const userId = getUserId();

    // Generate a unique callback function name
    const callbackName = 'handleResponse_' + Date.now();

    // Define the callback function
    window[callbackName] = function(data) {
        submitBtn.disabled = false;
        if (data.status === "success") {
            feedback.style.color = '#00FFAA';
            feedback.textContent = CONFIG.successMessage;
            messageInput.value = '';
            updateCharCounter();
            startCooldown();
            fetchConfessions(); // Refresh the confession feed after submission
        } else {
            // Server reported an error
            feedback.style.color = '#FF0000';
            feedback.textContent = data.error || "Server error.";
        }
        // Clean up: remove the script tag and callback function
        document.body.removeChild(script);
        delete window[callbackName];
    }

    // Create a script tag for JSONP
    const script = document.createElement('script');
    script.src = `${CONFIG.endpointURL}?action=submit&callback=${callbackName}&text=${encodeURIComponent(userText)}&device=${encodeURIComponent(device)}&userId=${encodeURIComponent(userId)}`;
    script.onerror = function() {
        submitBtn.disabled = false;
        feedback.style.color = '#FF0000';
        feedback.textContent = "Unable to connect to the server. Please try again later.";
        document.body.removeChild(script);
        delete window[callbackName];
    };
    document.body.appendChild(script);
}

/* Start Cooldown */
function startCooldown() {
    isCoolingDown = true;
    submitBtn.disabled = true;
    submitBtn.title = CONFIG.waitMessage; // Set tooltip

    setTimeout(() => {
        isCoolingDown = false;
        submitBtn.disabled = false;
        feedback.textContent = "";
        submitBtn.title = "Submit your confession"; // Reset tooltip
    }, CONFIG.cooldownTime);
}

/* Handle Enter Key */
function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitMessage();
    }
}

/* Handle Paste Event */
function handlePaste(e) {
    e.preventDefault();
    let pastedText = (e.clipboardData || window.clipboardData).getData('text');
    // Replace newlines with spaces
    pastedText = pastedText.replace(/\r?\n|\r/g, ' ');
    document.execCommand('insertText', false, pastedText);
}

/* Handle Input Event */
function handleInput() {
    // Remove any remaining newlines
    messageInput.value = messageInput.value.replace(/\r?\n|\r/g, ' ');
    updateCharCounter();
}

/* Update Character Counter */
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

/* Determine Device Type */
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

/* Fetch Confessions */
function fetchConfessions() {
    fetch(CONFIG.confessionsURL)
        .then(response => response.json())
        .then(data => {
            // Sort confessions by date descending
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

/* Load More Confessions */
function loadMoreConfessions() {
    const start = currentPage * CONFIG.confessionsPerPage;
    const end = start + CONFIG.confessionsPerPage;
    const confessionsToLoad = allConfessions.slice(start, end);

    confessionsToLoad.forEach(confession => {
        const confessionDiv = document.createElement('div');
        confessionDiv.classList.add('confession');

        // Check if the confession is promoted
        if (confession.promoted) {
            confessionDiv.classList.add('promoted');
        }

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

/* Parse Date String */
function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('/');
    // Handle special dates like "Sponsor Announcement"
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return new Date(); // Assign current date for sorting purposes
    }
    return new Date(`${year}-${month}-${day}`);
}

/*************************************
 *      Matrix-like Background
 *************************************/
const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Load confessions and extract words
let words = [];
fetch(CONFIG.confessionsURL)
    .then(response => response.json())
    .then(data => {
        data.forEach(confession => {
            // Split text into words and filter out short words
            const confessionWords = confession.text.split(' ').filter(word => word.length > 3);
            words = words.concat(confessionWords);
        });
        // Check if not on mobile before starting Matrix
        if (!isMobileDevice()) {
            startMatrix();
        }
    })
    .catch(error => console.error('Error loading confessions for Matrix:', error));

// Matrix settings
const fontSize = 16;
let columns = Math.floor(canvas.width / fontSize);
let drops = [];

// Initialize drops with random y-positions
for (let x = 0; x < columns; x++) {
    drops[x] = Math.random() * canvas.height / fontSize;
}

// Adjust columns and drops on resize
function adjustColumns() {
    columns = Math.floor(canvas.width / fontSize);
    drops = [];
    for (let x = 0; x < columns; x++) {
        drops[x] = Math.random() * canvas.height / fontSize;
    }
}
window.addEventListener('resize', adjustColumns);

/* Check if Device is Mobile */
function isMobileDevice() {
    const ua = navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod|android/.test(ua);
}

/* Start Matrix animation */
function startMatrix() {
    setInterval(drawMatrix, 85); // Slowed down by 30% from 65ms to 85ms
}

/* Draw Matrix frame */
function drawMatrix() {
    // Fade the background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set text style
    ctx.fillStyle = '#FF0000'; // Red color
    ctx.font = `${fontSize}px monospace`;

    // Draw words
    for (let i = 0; i < columns; i++) {
        const word = words[Math.floor(Math.random() * words.length)];
        ctx.fillText(word, i * fontSize, drops[i] * fontSize);

        // Reset drop if it goes beyond canvas
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        // Increment y position
        drops[i]++;
    }
}
