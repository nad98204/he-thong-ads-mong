import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { ref, get } from 'firebase/database';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- HÀM ĐĂNG NHẬP BẰNG EMAIL/PASS ---
  const login = async (email, password) => {
    try {
      // 1. Đăng nhập qua Firebase Auth
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // 2. Kiểm tra quyền trong Database (SettingsManager)
      const allowed = await checkUserPermission(user.email);
      
      if (!allowed) {
        await signOut(auth);
        throw new Error("Tài khoản này chưa được cấp quyền truy cập hệ thống!");
      }
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      throw error; // Ném lỗi ra để trang Login hiển thị
    }
  };

  // --- KIỂM TRA QUYỀN TRUY CẬP ---
  const checkUserPermission = async (email) => {
    try {
      const snapshot = await get(ref(db, 'system_settings/users')); 
      const usersList = snapshot.val() || [];
      
      // Tìm xem email có trong danh sách cấp quyền không
      // Lưu ý: usersList có thể là object hoặc array tùy firebase lưu
      const usersArray = Array.isArray(usersList) ? usersList : Object.values(usersList);
      
      const foundUser = usersArray.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
      
      if (foundUser) {
        setUserRole(foundUser.role);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Check permission error", error);
      return false;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const hasAccess = await checkUserPermission(user.email);
        if (hasAccess) {
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
          setUserRole(null);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    login, // Xuất hàm login mới
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}