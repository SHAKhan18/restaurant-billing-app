// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBO2pQ-HP2crvH6ErKfJicCxqByYE9_ecQ",
  authDomain: "restaurantbillingapp-6adda.firebaseapp.com",
  projectId: "restaurantbillingapp-6adda",
  storageBucket: "restaurantbillingapp-6adda.appspot.com",
  messagingSenderId: "323245137148",
  appId: "1:323245137148:web:dd8c46f4fa2ed95cf88b79",
  measurementId: "G-MMYEFWCT1Z"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
