// 1. Import các hàm cần thiết
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database'; // <--- QUAN TRỌNG: Phải có dòng này mới lưu được

// 2. Cấu hình Firebase (Tôi đã điền thông tin của bạn vào)
const firebaseConfig = {
  apiKey: 'AIzaSyDr6pJNY5ThZz2NMox5lqXLR_gihyxrNFU',
  authDomain: 'dangpkkzxy.firebaseapp.com',
  databaseURL:
    'https://dangpkkzxy-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'dangpkkzxy',
  storageBucket: 'dangpkkzxy.firebasestorage.app',
  messagingSenderId: '644778150594',
  appId: '1:644778150594:web:0c4dca15c424e86efc495b',
  measurementId: 'G-M7GQXCCF1C',
};

// 3. Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// 4. Xuất biến 'db' ra để các file khác dùng
export const db = getDatabase(app);
