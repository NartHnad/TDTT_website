// Import Firebase core
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your Firebase configuration (bạn đã gửi)
const firebaseConfig = {
  apiKey: "AIzaSyCGc4cUi-LNWQR-D8Obsc6fMx0_EQRT0_M",
  authDomain: "tdttwebsite.firebaseapp.com",
  projectId: "tdttwebsite",
  storageBucket: "tdttwebsite.firebasestorage.app",
  messagingSenderId: "888026130490",
  appId: "1:888026130490:web:a14a208da6cabb167d2d03",
  measurementId: "G-8FP435W4MK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and export it
export const auth = getAuth(app);
