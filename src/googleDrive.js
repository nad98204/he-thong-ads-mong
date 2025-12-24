import { useState, useEffect, useRef } from 'react';

// --- CẤU HÌNH ---
const CLIENT_ID = "322010885214-sdjt85uoetnj6dl06g83pig3hmef7mf6.apps.googleusercontent.com"; // Client ID của bạn
const SCOPES = "https://www.googleapis.com/auth/drive.file";

/**
 * Hook riêng để xử lý logic Google Drive
 * Cách dùng: const { uploadFile, isReady } = useGoogleDrive();
 */
export const useGoogleDrive = () => {
  const [tokenClient, setTokenClient] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // 1. Khởi tạo Google Identity Services (GIS)
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: () => {}, // Callback sẽ được ghi đè khi gọi request
        });
        setTokenClient(client);
        setIsReady(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script nếu cần
      // if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  // 2. Hàm lấy Access Token (trả về Promise)
  const getAccessToken = () => {
    return new Promise((resolve, reject) => {
      if (!tokenClient) return reject("Google API chưa sẵn sàng. Vui lòng đợi...");
      
      tokenClient.callback = (resp) => {
        if (resp.error) reject(resp);
        else resolve(resp.access_token);
      };
      
      // Mở popup xin quyền
      tokenClient.requestAccessToken({ prompt: '' }); // '' để nếu đã login rồi thì không hỏi lại
    });
  };

  // 3. Hàm Upload File chính
  const uploadFile = async (file) => {
    try {
      // Bước A: Lấy Token đăng nhập
      const accessToken = await getAccessToken();

      // Bước B: Chuẩn bị dữ liệu Upload (Multipart)
      const metadata = {
        name: file.name,
        mimeType: file.type,
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      // Bước C: Gọi API Upload
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload thất bại: ${errorText}`);
      }

      const data = await response.json();

      // Bước D: Set quyền Công khai (Public Reader)
      await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });

      // Trả về kết quả chuẩn để lưu vào Database
      return {
        success: true,
        name: file.name,
        link: data.webViewLink,       // Link xem
        downloadLink: data.webContentLink, // Link tải
        driveId: data.id,
        type: 'FILE',
        fileType: 'DRIVE_FILE' // Đánh dấu là file Drive
      };

    } catch (error) {
      console.error("Google Drive Error:", error);
      return { success: false, error: error.message };
    }
  };

  return { uploadFile, isReady };
};