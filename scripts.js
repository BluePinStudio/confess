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
        startMatrix();
    })
    .catch(error => console.error('Error loading confessions for Matrix:', error));

// Matrix settings
const fontSize = 16;
const columns = Math.floor(canvas.width / fontSize);
const drops = Array(columns).fill(0);

// Start Matrix animation
function startMatrix() {
    setInterval(drawMatrix, 50);
}

// Draw Matrix frame
function drawMatrix() {
    // Fade the background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set text style
    ctx.fillStyle = '#FF0000'; // Red color
    ctx.font = `${fontSize}px monospace`;

    // Draw words
    for (let i = 0; i < drops.length; i++) {
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
