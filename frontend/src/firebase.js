// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDqY-9aue5FpF8S3_jErWfm8y5zGcZuAHA",
  authDomain: "flashcards-95f15.firebaseapp.com",
  projectId: "flashcards-95f15",
  storageBucket: "flashcards-95f15.firebasestorage.app",
  messagingSenderId: "230014461497",
  appId: "1:230014461497:web:224247234c537054ac8fe8",
  measurementId: "G-5J9M5NQY87"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


export const db = getFirestore(app);