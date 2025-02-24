const socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    secure: true
});

socket.on('connect', () => {
    console.log('Connected to server:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Handle music controls (loaded in music.html)
function playSong(videoId) {
    socket.emit('play-song', { videoId });
}

function pauseSong() {
    socket.emit('pause-song');
}

socket.on('play-song', (data) => {
    const player = document.getElementById('youtube-player');
    if (player) {
        player.src = `https://www.youtube.com/embed/${data.videoId}?autoplay=1`;
    }
});

socket.on('pause-song', () => {
    const player = document.getElementById('youtube-player');
    if (player) player.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
});

// Handle seek events
window.addEventListener('message', (event) => {
    if (event.data && event.data.event === 'infoDelivery' && event.data.info && event.data.info.currentTime) {
        socket.emit('seek', { currentTime: event.data.info.currentTime });
    }
});

socket.on('seek', (data) => {
    const player = document.getElementById('youtube-player');
    if (player) {
        player.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${data.currentTime}, true]}`, '*');
    }
});

// Handle time update events
setInterval(() => {
    const player = document.getElementById('youtube-player');
    if (player && player.contentWindow) {
        player.contentWindow.postMessage('{"event":"command","func":"getCurrentTime","args":""}', '*');
    }
}, 1000);

window.addEventListener('message', (event) => {
    if (event.data && event.data.event === 'infoDelivery' && event.data.info && event.data.info.currentTime) {
        socket.emit('time-update', { currentTime: event.data.info.currentTime });
    }
});

socket.on('time-update', (data) => {
    const player = document.getElementById('youtube-player');
    if (player) {
        player.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${data.currentTime}, true]}`, '*');
    }
});

// Chat functionality
socket.on('update-users', (count) => {
    document.getElementById('userCount').textContent = count;
});

socket.on('load-messages', (messages) => {
    messages.forEach(addMessage);
});

socket.on('chat-message', (data) => {
    console.log('Message received:', data); // Add this line
    addMessage(data);
});

document.getElementById('messageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = document.getElementById('messageInput').value.trim();
    if (msg) {
        console.log('Sending message:', msg); // Add this line
        socket.emit('chat-message', { user: currentUser, text: msg });
        document.getElementById('messageInput').value = '';
    }
});

function addMessage(data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';
    if (data.user !== currentUser) {
        // For received messages (other users), show username above the message box
        const username = document.createElement('div');
        username.className = 'message-username';
        username.textContent = `${data.user}:`;
        wrapper.appendChild(username);
    }
    const div = document.createElement('div');
    div.className = 'message';
    if (data.user === currentUser) {
        // For self messages, only show text (no username)
        div.textContent = data.text;
        div.classList.add('sent');
    } else {
        // For received messages, show only text in the box
        div.textContent = data.text;
        div.classList.add('received');
    }
    wrapper.appendChild(div);
    // Dynamically adjust width based on message length
    const textLength = data.text.length;
    const minWidth = 100; // Minimum width in pixels
    const maxWidth = 70; // Max width as percentage (matches CSS max-width)
    const width = Math.min(textLength * 10, window.innerWidth * (maxWidth / 100));
    div.style.width = `${Math.max(minWidth, width)}px`;
    document.getElementById('messages').appendChild(wrapper);
    div.scrollIntoView({ behavior: 'smooth', block: 'end' }); // Smooth scroll to the bottom of the chat container
}
