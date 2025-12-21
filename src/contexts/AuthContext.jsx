import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { ref, get, onValue } from 'firebase/database';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // ADMIN, SALE, STAFF
  const [userPermissions, setUserPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- HÀM 1: ĐỒNG BỘ QUYỀN TỪ DB (REALTIME) ---
  const syncUserFromDB = (email) => {
    if (!email) return;

    const usersRef = ref(db, 'system_settings/users');
    onValue(usersRef, (snapshot) => {
      const val = snapshot.val();
      // Xử lý an toàn dù DB trả về Mảng hay Object
      const usersList = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
      
      const found = usersList.find(u => u?.email?.toLowerCase() === email.toLowerCase());

      if (found) {
        // Cập nhật quyền mới nhất từ DB
        setUserRole(found.role || 'STAFF');
        setUserPermissions(found.permissions || {});
        
        // Cập nhật thông tin phụ (tên, trạng thái)
        setCurrentUser(prev => ({
          ...prev, 
          name: found.name, 
          isActive: found.isActive 
        }));
      } else {
        // Nếu user bị xóa khỏi DB -> Đăng xuất
        logout();
      }
    });
  };

  // --- HÀM 2: ĐĂNG NHẬP ---
  const login = async (email, password) => {
    try {
      const snapshot = await get(ref(db, 'system_settings/users'));
      const val = snapshot.val();
      const usersList = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
      
      const foundUser = usersList.find(u => 
        u?.email?.toLowerCase() === email.toLowerCase().trim() && 
        String(u?.password) === String(password)
      );
      
      if (foundUser) {
        const userObj = { 
          email: foundUser.email, 
          name: foundUser.name,
          isActive: foundUser.isActive 
        };

        setCurrentUser(userObj);
        setUserRole(foundUser.role || 'STAFF');
        setUserPermissions(foundUser.permissions || {});
        
        syncUserFromDB(foundUser.email); // Bắt đầu lắng nghe thay đổi quyền

        localStorage.setItem('mong_logged_in_user', JSON.stringify(userObj));
        return true;
      } else {
        throw new Error("Email hoặc mật khẩu không đúng!");
      }
    } catch (error) {
      throw error;
    }
  };

  // --- HÀM 3: ĐĂNG XUẤT ---
  const logout = () => {
    localStorage.removeItem('mong_logged_in_user');
    setCurrentUser(null);
    setUserRole(null);
    setUserPermissions(null);
    window.location.href = "/login";
  };

  // --- HÀM 4: KHỞI TẠO ---
  useEffect(() => {
    const savedUserJSON = localStorage.getItem('mong_logged_in_user');
    if (savedUserJSON) {
      try {
        const user = JSON.parse(savedUserJSON);
        if (user && user.email) {
          setCurrentUser(user);
          syncUserFromDB(user.email); // Đồng bộ lại quyền ngay khi mở web
        }
      } catch (e) {
        localStorage.removeItem('mong_logged_in_user');
      }
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userRole, userPermissions, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}