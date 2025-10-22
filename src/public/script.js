// API Base URL
const API_URL = window.location.origin;

// State
let currentUserId = localStorage.getItem('currentUserId');
let users = [];

// DOM Elements
const registrationForm = document.getElementById('registrationForm');
const currentUserSection = document.getElementById('currentUserSection');
const currentUserCard = document.getElementById('currentUserCard');
const usersList = document.getElementById('usersList');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    // Refresh users list every 30 seconds
    setInterval(loadUsers, 30000);

    // Update countdowns every second
    setInterval(updateAllCountdowns, 1000);
});

// Handle form submission
registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('name').value);
    formData.append('date_of_birth', document.getElementById('date_of_birth').value);
    formData.append('city', document.getElementById('city').value);

    const photoInput = document.getElementById('photo');
    if (photoInput.files[0]) {
        formData.append('photo', photoInput.files[0]);
    }

    try {
        const response = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Registration failed');
        }

        const newUser = await response.json();
        currentUserId = newUser.id;
        localStorage.setItem('currentUserId', currentUserId);

        // Hide form and show success
        registrationForm.style.display = 'none';
        document.querySelector('.registration-card h2').textContent = '🎉 Successfully Registered!';

        // Reload users to show the new registration
        await loadUsers();

    } catch (error) {
        console.error('Error registering user:', error);
        alert('Failed to register. Please try again.');
    }
});

// Load all users from API
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/api/users`);
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        users = await response.json();
        displayUsers();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Display users in the UI
function displayUsers() {
    // Clear current displays
    currentUserCard.innerHTML = '';
    usersList.innerHTML = '';

    if (users.length === 0) {
        usersList.innerHTML = '<p style="text-align: center; color: #666;">No one has registered yet. Be the first!</p>';
        return;
    }

    users.forEach(user => {
        const userCardHTML = createUserCard(user);

        if (user.id === parseInt(currentUserId)) {
            // Show current user in their own section
            currentUserSection.style.display = 'block';
            currentUserCard.innerHTML = userCardHTML;
        } else {
            // Show other users in the grid
            const cardDiv = document.createElement('div');
            cardDiv.innerHTML = userCardHTML;
            usersList.appendChild(cardDiv.firstElementChild);
        }
    });

    // Update all countdowns immediately
    updateAllCountdowns();
}

// Create HTML for a user card
function createUserCard(user) {
    const age = calculateAge(user.date_of_birth);
    const isCurrentUser = user.id === parseInt(currentUserId);

    const photoHTML = user.photo_url
        ? `<img src="${user.photo_url}" alt="${user.name}" class="user-photo">`
        : `<div class="user-photo-placeholder">🎅</div>`;

    const removeButtonHTML = isCurrentUser
        ? `<button class="btn-remove" onclick="removeCurrentUser()">Remove Me</button>`
        : '';

    // Make city clickable if coordinates are available
    const cityHTML = user.latitude && user.longitude
        ? `<div class="user-city clickable" onclick='showMap(${JSON.stringify(user.city)}, ${user.latitude}, ${user.longitude})'>📍 ${escapeHtml(user.city)} 🗺️</div>`
        : `<div class="user-city">📍 ${escapeHtml(user.city)}</div>`;

    return `
        <div class="user-card ${isCurrentUser ? 'current-user-card' : ''}" data-user-id="${user.id}">
            ${photoHTML}
            <div class="user-info">
                <div class="user-name">${escapeHtml(user.name)}</div>
                ${cityHTML}
                <div class="user-age">🎂 ${age} years old</div>
                <div class="countdown" id="countdown-${user.id}">
                    <span class="countdown-number">-</span>
                    <span class="countdown-label">Calculating...</span>
                </div>
                ${removeButtonHTML}
            </div>
        </div>
    `;
}

// Calculate age from date of birth
function calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

// Calculate time until Christmas in a specific timezone
function calculateTimeUntilChristmas(timezone) {
    try {
        const now = new Date();

        // Get current time in the user's timezone
        let currentTime, christmasTime;

        if (!timezone) {
            // Use local timezone
            currentTime = now;
            const currentYear = now.getFullYear();
            christmasTime = new Date(currentYear, 11, 25, 0, 0, 0);

            if (now > christmasTime) {
                christmasTime = new Date(currentYear + 1, 11, 25, 0, 0, 0);
            }
        } else {
            // Get time in user's timezone
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: false
            });

            const parts = formatter.formatToParts(now);
            const tzYear = parseInt(parts.find(p => p.type === 'year').value);
            const tzMonth = parseInt(parts.find(p => p.type === 'month').value);
            const tzDay = parseInt(parts.find(p => p.type === 'day').value);
            const tzHour = parseInt(parts.find(p => p.type === 'hour').value);
            const tzMinute = parseInt(parts.find(p => p.type === 'minute').value);
            const tzSecond = parseInt(parts.find(p => p.type === 'second').value);

            // Create Christmas date in their timezone
            let christmasYear = tzYear;
            if (tzMonth === 12 && tzDay > 25) {
                christmasYear = tzYear + 1;
            }

            // Convert both to UTC for accurate calculation
            const nowUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
            const christmasUtc = Date.UTC(christmasYear, 11, 25, 0, 0, 0);

            const timeDiff = christmasUtc - nowUtc;

            if (timeDiff <= 0) {
                return { days: 0, hours: 0, minutes: 0, seconds: 0, isChristmas: true };
            }

            const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

            return { days, hours, minutes, seconds, isChristmas: false };
        }

        // For local timezone calculation
        const timeDiff = christmasTime - currentTime;

        if (timeDiff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, isChristmas: true };
        }

        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds, isChristmas: false };
    } catch (err) {
        console.error('Error calculating timezone-aware countdown:', err);
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isChristmas: false };
    }
}

// Update all countdown displays
function updateAllCountdowns() {
    users.forEach(user => {
        const countdownElement = document.getElementById(`countdown-${user.id}`);
        if (countdownElement) {
            // Calculate time for this user's timezone
            const timeLeft = calculateTimeUntilChristmas(user.timezone);

            if (timeLeft.isChristmas) {
                countdownElement.innerHTML = `
                    <div class="christmas-message">
                        🎄 It's Christmas! 🎄
                    </div>
                `;
            } else {
                const timezoneLabel = user.timezone ? ` <span class="timezone-label">${user.timezone}</span>` : '';
                countdownElement.innerHTML = `
                    <div class="countdown-grid">
                        <div class="countdown-unit">
                            <span class="countdown-number">${timeLeft.days}</span>
                            <span class="countdown-label">${timeLeft.days === 1 ? 'Day' : 'Days'}</span>
                        </div>
                        <div class="countdown-unit">
                            <span class="countdown-number">${String(timeLeft.hours).padStart(2, '0')}</span>
                            <span class="countdown-label">Hours</span>
                        </div>
                        <div class="countdown-unit">
                            <span class="countdown-number">${String(timeLeft.minutes).padStart(2, '0')}</span>
                            <span class="countdown-label">Minutes</span>
                        </div>
                        <div class="countdown-unit">
                            <span class="countdown-number">${String(timeLeft.seconds).padStart(2, '0')}</span>
                            <span class="countdown-label">Seconds</span>
                        </div>
                    </div>
                    ${timezoneLabel}
                `;
            }
        }
    });
}

// Remove current user
async function removeCurrentUser() {
    if (!currentUserId) return;

    if (!confirm('Are you sure you want to remove yourself from the countdown?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/users/${currentUserId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to remove user');
        }

        // Clear local storage
        localStorage.removeItem('currentUserId');
        currentUserId = null;

        // Reset UI
        currentUserSection.style.display = 'none';
        registrationForm.style.display = 'block';
        document.querySelector('.registration-card h2').textContent = '🎅 Register for the Countdown';
        registrationForm.reset();

        // Reload users
        await loadUsers();

    } catch (error) {
        console.error('Error removing user:', error);
        alert('Failed to remove user. Please try again.');
    }
}

// Utility function to escape HTML and prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Map functionality
let map = null;
let marker = null;

function showMap(cityName, lat, lon) {
    const modal = document.getElementById('mapModal');
    const mapDiv = document.getElementById('map');
    const titleElement = document.getElementById('mapModalTitle');

    // Update title
    titleElement.textContent = `${cityName} on the World Map`;

    // Show modal
    modal.style.display = 'flex';

    // Small delay to ensure modal is visible before initializing map
    setTimeout(() => {
        // Destroy existing map if it exists
        if (map) {
            map.remove();
            map = null;
        }

        // Create new map
        map = L.map('map').setView([lat, lon], 10);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);

        // Add marker
        marker = L.marker([lat, lon]).addTo(map);
        marker.bindPopup(`<b>${cityName}</b><br>Latitude: ${lat.toFixed(4)}<br>Longitude: ${lon.toFixed(4)}`).openPopup();

        // Add a nice animation to zoom out and show the world, then zoom back in
        setTimeout(() => {
            map.setView([lat, lon], 2, { animate: true, duration: 1.5 });
            setTimeout(() => {
                map.setView([lat, lon], 10, { animate: true, duration: 1.5 });
            }, 2000);
        }, 500);
    }, 100);
}

function closeMap() {
    const modal = document.getElementById('mapModal');
    modal.style.display = 'none';

    // Destroy map when closing
    if (map) {
        map.remove();
        map = null;
    }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('mapModal');
    if (event.target === modal) {
        closeMap();
    }
}

// Close modal on Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('mapModal');
        if (modal.style.display === 'flex') {
            closeMap();
        }
    }
});
