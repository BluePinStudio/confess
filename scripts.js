/*************************************
 *           CONFIGURATION
 *************************************/
const CONFIG = {
    endpointURL: "https://script.google.com/macros/s/AKfycbxQ1bHA--m108-seLbSOpgFIRAWSgpS8zDbqgwM5xGLASy3ig03gQO6l5u4haAKEPhREA/exec",
    minChars: 10,
    maxChars: 280,
    cooldownTime: 10000,
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
    announcementsURL: "announcements.json",
    confessionsPerPage: 5
};

/*************************************
 *        DOM ELEMENTS
 *************************************/
const confessionFeed = document.getElementById('confessionFeed');

/*************************************
 *        Fetch Announcements
 *************************************/
function fetchAnnouncements() {
    fetch(CONFIG.announcementsURL)
        .then(response => response.json())
        .then(data => {
            data.forEach(announcement => {
                const announcementDiv = document.createElement('div');
                announcementDiv.classList.add('announcement', 'promoted');

                const sponsoredMessage = document.createElement('div');
                sponsoredMessage.classList.add('sponsored-message');
                sponsoredMessage.textContent = announcement.sponsoredMessage;

                const textDiv = document.createElement('div');
                textDiv.classList.add('text');
                textDiv.textContent = announcement.text;

                announcementDiv.appendChild(sponsoredMessage);
                announcementDiv.appendChild(textDiv);

                confessionFeed.prepend(announcementDiv);
            });
        })
        .catch(error => {
            console.error('Error fetching announcements:', error);
        });
}

// Call fetchAnnouncements during the initial load
fetchAnnouncements();

/*************************************
 *          Fetch Confessions
 *************************************/
function fetchConfessions() {
    fetch(CONFIG.confessionsURL)
        .then(response => response.json())
        .then(data => {
            confessionFeed.innerHTML = ''; // Clear confessions
            data.forEach(confession => {
                const confessionDiv = document.createElement('div');
                confessionDiv.classList.add('confession');

                const textDiv = document.createElement('div');
                textDiv.textContent = confession.text;

                confessionDiv.appendChild(textDiv);
                confessionFeed.appendChild(confessionDiv);
            });
        });
}

fetchConfessions();
