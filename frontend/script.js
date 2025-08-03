// AI Hashtag Generator MVP JavaScript
// This script implements the core logic for the MVP version of the hashtag generator.
// It should be included at the end of the HTML or after DOMContentLoaded.

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // ✅ Port 3000

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey:"AIzaSyBJYurFOgXtSPPLTQLSGwNxbBhf5D2yNn8",
  authDomain:"myminibasedatapp.firebaseapp.com",
  projectId:"myminibasedatapp",
  storageBucket:"myminibasedatapp.firebasestorage.app",
  messagingSenderId:"937665683412",
  appId:"1:937665683412:web:b6fe9140de376d210c4041",
  measurementId:"G-SD0GDW2PSH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
// Initialize Firestore
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', function () {
    // 1. Get Element References
    const imageUpload = document.getElementById('imageUpload');
    const contentDescription = document.getElementById('contentDescription');
    const generateBtn = document.getElementById('generateBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const hashtagOutput = document.getElementById('hashtagOutput');
    const fileName = document.getElementById('fileName');

    // 2. Handle Image File Selection
    imageUpload.addEventListener('change', function () {
        if (imageUpload.files && imageUpload.files.length > 0) {
            fileName.textContent = imageUpload.files[0].name;
        } else {
            fileName.textContent = 'No file chosen';
        }
    });

    // 3. Handle 'Generate Hashtags' Button Click
    generateBtn.addEventListener('click', async function () {
        // Clear output and show loading message
        hashtagOutput.innerHTML = '<em>Generating hashtags...</em>';

        const imageFile = imageUpload.files[0];
        const descriptionText = contentDescription.value.trim();

        // Basic client-side validation
        if (!imageFile && !descriptionText) {
            hashtagOutput.innerHTML = '<span style="color: #e74c3c;">Please upload an image or provide a description.</span>';
            return;
        }

        // Prepare data for backend
        const formData = new FormData();
        if (imageFile) {
            formData.append('image', imageFile);
        }
        if (descriptionText) {
            formData.append('description', descriptionText);
        }

        // Send data to backend and handle response
        try {
            const response = await fetch(`${API_BASE_URL}/generate-hashtags`, {
                method: 'POST',
                body: formData
                // Do NOT set Content-Type header when using FormData
            });

            if (response.ok) {
                const data = await response.json();
                const hashtags = data.hashtags;
                hashtagOutput.innerHTML = '<strong>Suggested Hashtags:</strong><br>' + hashtags;
            } else {
                // Try to parse backend error message
                let errorMsg = 'An error occurred.';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {}
                hashtagOutput.innerHTML = `<span style="color: red;">${errorMsg}</span>`;
            }
        } catch (err) {
            // Handle network or unexpected errors
            hashtagOutput.innerHTML = '<span style="color: red;">An unexpected error occurred. Please try again.</span>';
            console.error('Fetch error:', err);
        }
    });

    // 4. Handle 'Clear All' Button Click
    clearAllBtn.addEventListener('click', function () {
        imageUpload.value = '';
        fileName.textContent = 'No file chosen';
        contentDescription.value = '';
        hashtagOutput.innerHTML = '';
        console.log('All fields cleared.');
    });

    const auth = firebase.auth();

    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authStatus = document.getElementById('authStatus');

    // Register
    registerBtn.onclick = async () => {
      try {
        await auth.createUserWithEmailAndPassword(authEmail.value, authPassword.value);
        authStatus.textContent = "Registration successful!";
      } catch (error) {
        authStatus.textContent = error.message;
      }
    };

    // Login
    loginBtn.onclick = async () => {
      try {
        await auth.signInWithEmailAndPassword(authEmail.value, authPassword.value);
        authStatus.textContent = "Login successful!";
      } catch (error) {
        authStatus.textContent = error.message;
      }
    };

    // Logout
    logoutBtn.onclick = async () => {
      await auth.signOut();
      authStatus.textContent = "Logged out.";
    };

    // Auth state listener
    auth.onAuthStateChanged(user => {
      if (user) {
        logoutBtn.style.display = '';
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        authStatus.textContent = `Logged in as ${user.email}`;
        // You can now allow access to the rest of your app, or store user info in Firestore
        if (user) {
          db.collection('users').doc(user.uid).set({
            email: user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      } else {
        logoutBtn.style.display = 'none';
        loginBtn.style.display = '';
        registerBtn.style.display = '';
        authStatus.textContent = 'Not logged in.';
      }
    });
}); 