        // Firebase Configuration
        const firebaseConfig = {
  apiKey: "AIzaSyBaynxq3uG04HHz9X5Wc-zu9jWimAocVRk",
  authDomain: "hiochat-b4.firebaseapp.com",
  projectId: "hiochat-b4",
  storageBucket: "hiochat-b4.firebasestorage.app",
  messagingSenderId: "671564815148",
  appId: "1:671564815148:web:6d0857df5b692121bf2a89"
};
    
        // Cloudinary Configuration
        const cloudName = 'dy1fqwyap';
        const uploadPreset = 'HiOChat-B4';
    
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        const auth = firebase.auth();
    
        // DOM Elements
        const authModal = document.getElementById('authModal');
        const mainContainer = document.getElementById('mainContainer');
        const nsoun1 = document.getElementById('nsoun1');
        const recordButton = document.getElementById('recordButton');
        const recordingIndicator = document.getElementById('recordingIndicator');
        let authModalShown = false;
    
        // Global Variables for Message Seen Feature and Voice Recording
        let chatMessages = [];
        let usersLastActive = {};
        let lastMessageCount = 0;
        let mediaRecorder;
        let audioChunks = [];
        let recordingStartTime;
        let timerInterval;
    
        // **Audio Player Initialization Function**
        function initializeAudioPlayer(audioPlayer) {
            const audioUrl = audioPlayer.dataset.url;
            const audio = new Audio(audioUrl);
            const btnPlayToggle = audioPlayer.querySelector(".btn-play");
            const slider = audioPlayer.querySelector("input[type='range']");
    
            function formatTimeToDisplay(seconds) {
                const milliseconds = seconds * 1000;
                return new Date(milliseconds).toISOString().substr(14, 5);
            }
    
            function handlePlayButton() {
                audio.paused ? audio.play() : audio.pause();
            }
    
            function handleSlider(e) {
                const { duration } = audio;
                const percent = e.target.value;
                const currentTimeInSeconds = (percent * duration) / 100; // Removed toFixed(2) for simplicity
                audio.currentTime = currentTimeInSeconds;
            }
    
            function updateCurrentTimeDisplay(time) {
                audioPlayer.style.setProperty("--player-current-time", `'${time}'`);
            }
    
            function updateCurrentPercent() {
                const { currentTime, duration } = audio;
                const percentPlayed = (currentTime * 100) / duration || 0; // Handle NaN if duration is undefined
                slider.value = percentPlayed;
                audioPlayer.style.setProperty("--player-percent-played", `${percentPlayed}%`);
            }
    
            function showTimeDuration() {
                const { duration } = audio;
                const durationDisplay = formatTimeToDisplay(duration);
                updateCurrentTimeDisplay(durationDisplay);
            }
    
            // Set up event listeners
            btnPlayToggle.onclick = handlePlayButton;
            slider.oninput = handleSlider;
    
            audio.onloadstart = () => {
                setMessageDate();
                audioPlayer.classList.add("loading");
            };
            audio.onplay = () => audioPlayer.classList.add("playing");
            audio.onpause = () => audioPlayer.classList.remove("playing");
            audio.onloadeddata = () => audioPlayer.classList.remove("loading");
            audio.ondurationchange = showTimeDuration;
            audio.onended = () => (audio.currentTime = 0);
            audio.ontimeupdate = () => {
                const { currentTime } = audio;
                const currentTimeDisplay = formatTimeToDisplay(currentTime);
                updateCurrentTimeDisplay(currentTimeDisplay);
                updateCurrentPercent();
                if (currentTime === 0) {
                    showTimeDuration();
                }
            };
        }
    
        // Update Last Active Function
        function updateLastActive() {
            const user = auth.currentUser;
            if (user) {
                db.collection('users').doc(user.uid).update({
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    
        // Function to set user offline
        async function setUserOffline() {
            const user = auth.currentUser;
            if (user) {
                await db.collection('users').doc(user.uid).update({
                    online: false,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    
        // Auth State Listener
        auth.onAuthStateChanged(async user => {
            if (user) {
                authModal.style.display = 'none';
                mainContainer.classList.remove('hidden');
                authModalShown = true;
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    online: true,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                updateLastActive();
            } else {
                if (!authModalShown) {
                    authModal.style.display = 'flex';
                }
                mainContainer.classList.add('hidden');
            }
        });
    
        // Auth Functions
        function toggleAuthForms() {
            document.getElementById('signUpForm').classList.toggle('hidden');
            document.getElementById('signInForm').classList.toggle('hidden');
        }
    
        async function signUp(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const name = document.getElementById('name').value;
            const photoFile = document.getElementById('profilePhoto').files[0];
            let photoURL = 'https://i.ibb.co/gMP06kwL/Profile.png';
            if (photoFile) {
                const formData = new FormData();
                formData.append('file', photoFile);
                formData.append('upload_preset', uploadPreset);
                try {
                    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    photoURL = data.secure_url;
                } catch (error) {
                    alert('Error uploading profile photo');
                    return;
                }
            }
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                await userCredential.user.updateProfile({
                    displayName: name,
                    photoURL: photoURL
                });
            } catch (error) {
                alert(error.message);
            }
        }
    
        async function signIn(e) {
            e.preventDefault();
            const email = document.getElementById('signinEmail').value;
            const password = document.getElementById('signinPassword').value;
            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                alert(error.message);
            }
        }
    
        async function signOut() {
            await setUserOffline();
            auth.signOut();
            authModalShown = false;
        }
    
        // User List
        db.collection('users').onSnapshot(snapshot => {
            const userList = document.getElementById('userList');
            userList.innerHTML = '';
            usersLastActive = {};
            snapshot.forEach(doc => {
                const user = doc.data();
                usersLastActive[user.uid] = user.lastActive?.toDate();
                const lastActiveTime = user.lastActive?.toDate();
                let status = 'Offline';
                if (lastActiveTime) {
                    const now = new Date();
                    const diffSeconds = (now - lastActiveTime) / 1000;
                    if (diffSeconds < 15) {
                        status = 'Online';
                    } else {
                        const units = [
                            { unit: 'year', seconds: 31536000 },
                            { unit: 'month', seconds: 2592000 },
                            { unit: 'day', seconds: 86400 },
                            { unit: 'hour', seconds: 3600 },
                            { unit: 'minute', seconds: 60 },
                            { unit: 'second', seconds: 1 }
                        ];
                        for (const { unit, seconds } of units) {
                            const value = Math.round(diffSeconds / seconds);
                            if (value >= 1) {
                                status = `Last seen ${value} ${unit}${value !== 1 ? 's' : ''} ago`;
                                break;
                            }
                        }
                    }
                }
                const userItem = document.createElement('div');
                userItem.className = 'uiem1';
                userItem.innerHTML = `
                    <img src="${user.photoURL}" class="us1ar" alt="${user.name}">
                    <div>
                        <h4>${user.name}</h4>
                        <small class="sm1oo">${status}</small>
                    </div>
                `;
                userList.appendChild(userItem);
            });
            if (chatMessages.length > 0) {
                renderMessages();
            }
        });
    
        // File Upload Handling
        document.getElementById('fileInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', uploadPreset);
                try {
                    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    sendFileMessage(data.secure_url, data.resource_type, data.format ? `application/${data.format}` : null);
                } catch (error) {
                    console.error('Upload error:', error);
                    alert('File upload failed');
                }
            }
        });
    
        // Voice Recording Functionality
        recordButton.addEventListener('mousedown', startRecording);
        recordButton.addEventListener('mouseup', stopRecording);
        recordButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startRecording();
        });
        recordButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            stopRecording();
        });
    
        function startRecording() {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.start();
                    recordButton.classList.add('recording');
                    recordingIndicator.classList.add('visible');
                    recordingStartTime = Date.now();
                    timerInterval = setInterval(updateRecordingTimer, 1000);
    
                    audioChunks = [];
                    mediaRecorder.ondataavailable = event => {
                        audioChunks.push(event.data);
                    };
    
                    mediaRecorder.onstop = async () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        const formData = new FormData();
                        formData.append('file', audioBlob);
                        formData.append('upload_preset', uploadPreset);
    
                        try {
                            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
                                method: 'POST',
                                body: formData
                            });
                            const data = await response.json();
                            sendFileMessage(data.secure_url, 'audio', 'audio/webm');
                        } catch (error) {
                            console.error('Upload error:', error);
                            alert('Audio upload failed');
                        }
                        stream.getTracks().forEach(track => track.stop());
                    };
                })
                .catch(error => {
                    console.error('Error accessing microphone:', error);
                    alert('Microphone access denied');
                });
        }
    
        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                recordButton.classList.remove('recording');
                recordingIndicator.classList.remove('visible');
                clearInterval(timerInterval);
                document.getElementById('recordingTimer').textContent = '00:00';
            }
        }
    
        function updateRecordingTimer() {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('recordingTimer').textContent = `${minutes}:${seconds}`;
        }
    
        // Send File Message
        function sendFileMessage(fileUrl, fileType, mimeType) {
            const user = auth.currentUser;
            if (user) {
                db.collection("messages").add({
                    attachment: {
                        type: fileType,
                        url: fileUrl,
                        mimeType: mimeType
                    },
                    text: '',
                    name: user.displayName,
                    userId: user.uid,
                    photoURL: user.photoURL,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'sent'
                }).then(docRef => {
                    docRef.update({ status: 'delivered' });
                    updateLastActive();
                });
            }
        }
    
        // Send Text Message
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const user = auth.currentUser;
            if (input.value.trim() && user) {
                db.collection("messages").add({
                    text: input.value,
                    name: user.displayName,
                    userId: user.uid,
                    photoURL: user.photoURL,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'sent'
                }).then(docRef => {
                    docRef.update({ status: 'delivered' });
                    updateLastActive();
                });
                input.value = '';
            }
        }
    
        // Format Chat Date
        function formatChatDate(date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const messageDate = new Date(date);
            messageDate.setHours(0, 0, 0, 0);
            const diffDays = Math.round((today - messageDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
            return messageDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
    
        // Render Messages with Audio Player Initialization
        db.collection("messages").orderBy("timestamp").onSnapshot(snapshot => {
            const newMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            const currentUser = auth.currentUser;
            if (newMessages.length > lastMessageCount) {
                const latestMessage = newMessages[newMessages.length - 1];
                if (currentUser && latestMessage.userId !== currentUser.uid) {
                    nsoun1.play().catch(error => {
                        console.log("Error playing notification sound:", error);
                    });
                }
            }
            chatMessages = newMessages;
            lastMessageCount = chatMessages.length;
            renderMessages();
        });
    
        function renderMessages() {
            const messages = document.getElementById('messages');
            messages.innerHTML = '';
            let lastDisplayDate = null;
            chatMessages.forEach(msg => {
                const msgDate = msg.timestamp?.toDate();
                const currentDate = msgDate ? msgDate.toISOString().split('T')[0] : null;
                if (currentDate && currentDate !== lastDisplayDate) {
                    const separator = document.createElement('div');
                    separator.className = 'da1or';
                    separator.innerHTML = `<span>${formatChatDate(msgDate)}</span>`;
                    messages.appendChild(separator);
                    lastDisplayDate = currentDate;
                }
                const isCurrentUser = msg.userId === auth.currentUser?.uid;
                const time = msgDate ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                let status = 'sent';
                if (isCurrentUser) {
                    const messageTime = msg.timestamp?.toDate();
                    if (messageTime) {
                        const seenByOthers = Object.entries(usersLastActive).some(([uid, lastActive]) => uid !== msg.userId && lastActive && lastActive > messageTime);
                        status = seenByOthers ? 'seen' : 'delivered';
                    }
                }
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${isCurrentUser ? 'user' : 'sm1'}`;
                messageDiv.innerHTML = `
                    <div class="me1nt">
                        <div class="me1fo">
                            <img src="${msg.photoURL}" class="us1ar-m">
                            <span class="us1me">${msg.name}</span>
                        </div>
                        ${msg.text ? `<p>${msg.text}</p>` : ''}
                        ${msg.attachment ? `
                            ${msg.attachment.type === 'image' ? `
                                <img src="${msg.attachment.url}" class="me1ge" onclick="openFullscreen('${msg.attachment.url}')" alt="Chat image">
                            ` : msg.attachment.type === 'video' ? `
                                <div class="vc1pb">
                                    <video class="vi1ck" src="${msg.attachment.url}" onclick="openVideo()"></video>
                                    <div class="vcpb" onclick="openVideo()">
                                        <svg viewBox="0 0 32 32">
                                            <path fill="rgb(255, 255, 255, 0.7)" d="M0 16C0 7.163 7.163 0 16 0s16 7.163 16 16-7.163 16-16 16S0 24.837 0 16Z"></path>
                                            <path fill="#000" d="M13 10.92v10.16a1 1 0 0 0 1.573.819l7.257-5.08a1 1 0 0 0 0-1.638l-7.256-5.08a1 1 0 0 0-1.574.82Z"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div class="vi1ay" id="videoOverlay">
                                    <div class="vi1er">
                                        <video id="popupVideo" controls>
                                            <source src="${msg.attachment.url}" type="video/mp4">
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                </div>
                            ` : msg.attachment.type === 'audio' ? `
                                <div class="audio-player" data-url="${msg.attachment.url}">
                                    <div class="player">
                                        <button type="button" class="btn-play">
                                            <span class="material-icons icon-play"><svg class="pl2on" viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg></span>
                                            <span class="material-icons icon-pause"><svg class="pl2on" viewBox="0 0 320 512"><path d="M48 64C21.5 64 0 85.5 0 112L0 400c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48L48 64zm192 0c-26.5 0-48 21.5-48 48l0 288c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48l-32 0z"/></svg></span>
                                            <span class="material-icons icon-loop"><svg class="pl2on" viewBox="0 0 512 512"><path d="M386.3 160L336 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l128 0c17.7 0 32-14.3 32-32l0-128c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 51.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0s-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3s163.8-62.5 226.3 0L386.3 160z"/></svg></span>
                                        </button>
                                        <div class="timeline">
                                            <div class="line">
                                                <input dir="ltr" type="range" min="0" max="100" value="0">
                                            </div>
                                            <div class="data">
                                                <div class="current-time"></div>
                                                <div class="time"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="user">
                                        <img src="${msg.photoURL}" />
                                        <span class="material-icons">mic</span>
                                    </div>
                                </div>
                            ` : msg.attachment.type === 'raw' ? `
                                <div class="fi1ge">
                                    <a href="${msg.attachment.url}" target="_blank" class="fi1nk">
                                        <div class="fmi1"><img src="https://cdn.pixabay.com/photo/2017/03/08/21/21/file-2127833_640.png"></div>
                                        File Download
                                    </a>
                                </div>
                            ` : ''}
                        ` : ''}
                        <div class="me1fo">
                            <span class="me1me">${time}</span>
                            ${isCurrentUser ? `
                                <div class="me1us">
                                    <span class="material-icons">${status === 'seen' ? 'done_all' : 'check'}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
                messages.appendChild(messageDiv);
            });
            messages.scrollTop = messages.scrollHeight;
    
            // **Initialize all audio players after rendering**
            document.querySelectorAll('.audio-player').forEach(initializeAudioPlayer);
        }
    
        // Mobile Menu
        function toggleUserList() {
            document.getElementById('userList').classList.toggle('active');
        }
    
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 768 && !e.target.closest('.us1st') && !e.target.closest('.me1on')) {
                document.getElementById('userList').classList.remove('active');
            }
        });
    
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    
const audioPlayers = document.querySelectorAll(".audio-player");
audioPlayers.forEach((audioPlayer) => {
  // Audio player initialization code
});

        // Enhanced beforeunload handler
        window.addEventListener('beforeunload', async (event) => {
            const user = auth.currentUser;
            if (user) {
                const data = {
                    online: false,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                };
                if (navigator.sendBeacon) {
                    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                    navigator.sendBeacon(`https://firestore.googleapis.com/v1/projects/hiochat/databases/(default)/documents/users/${user.uid}`, blob);
                } else {
                    await db.collection('users').doc(user.uid).update(data);
                }
            }
        });
    
        // Fullscreen Image and Video Handlers
        function openFullscreen(imageUrl) {
            const overlay = document.createElement('div');
            overlay.className = 'fu1ay';
            overlay.onclick = () => document.body.removeChild(overlay);
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'fu1ge';
            overlay.appendChild(img);
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
            overlay.addEventListener('click', () => {
                document.body.style.overflow = '';
            });
        }
    
        document.getElementById('profilePhoto').addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('profilePreview');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    preview.src = event.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    
        function scrollToBottom() {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'instant'
            });
        }
        scrollToBottom();
    
        function openVideo() {
            const overlay = document.getElementById('videoOverlay');
            const video = document.getElementById('popupVideo');
            overlay.style.display = 'block';
            video.play();
        }
    
        function closeVideo() {
            const overlay = document.getElementById('videoOverlay');
            const video = document.getElementById('popupVideo');
            video.pause();
            overlay.style.display = 'none';
        }
    
        window.onclick = function(event) {
            const overlay = document.getElementById('videoOverlay');
            if (event.target === overlay) {
                closeVideo();
            }
        }