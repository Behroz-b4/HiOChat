<h3>HiOChat is a free web-based group chat application that allows users to engage in real-time conversations. It functions similarly to popular messaging platforms like WhatsApp and LINE. HiOChat enables users to create and join group chats, send and receive messages instantly, and enjoy a seamless chatting experience—all through a simple, browser-accessible interface.</h3>

<h2>Step 1: Create Firebase Account</h2>
<h4>1. Create Authentication with email and password.</h4>
<h4>2. Create Firestore Database and rules below: </h4>
<pre><code>rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{document} {
      allow read, create: if request.auth != null;
    }
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}</code></pre>
<h2>Demo Screenshort</h2>
<p>Live Demo link: <a href="https://behroz-b4.github.io/HiOChat">HiOChat</a></p><br>
<br>

![HiOChat SS1](https://github.com/user-attachments/assets/4b6ca1ac-c81b-44ce-a003-a29a660f9234)
![HiOChat SS2](https://github.com/user-attachments/assets/39f87bf4-42f0-47e1-b580-7211165a002e)
![HiOChat SS3](https://github.com/user-attachments/assets/15d28fe2-36a5-4914-9a5a-69d8bf42c77a)


