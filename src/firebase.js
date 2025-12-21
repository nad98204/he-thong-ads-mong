// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; 

const firebaseConfig = {
  apiKey: "AIzaSyDr6pJNY5ThZz2NMox5lqXLR_gihyxrNFU",
  authDomain: "dangpkkzxy.firebaseapp.com",
  databaseURL: "https://dangpkkzxy-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dangpkkzxy",
  storageBucket: "dangpkkzxy.firebasestorage.app",
  messagingSenderId: "644778150594",
  appId: "1:644778150594:web:0c4dca15c424e86efc495b",
  measurementId: "G-M7GQXCCF1C"
};

const app = initializeApp(firebaseConfig);

// [QUAN TRỌNG] Thêm tham số thứ 2 là URL để ép buộc kết nối đúng server Singapore
// Nếu không có dòng này, một số trường hợp nó sẽ tự trỏ về Mỹ gây lỗi treo Loading
export const db = getDatabase(app, "https://dangpkkzxy-default-rtdb.asia-southeast1.firebasedatabase.app");

// Xuất Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();