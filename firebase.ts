
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 注意：這裡的配置應從 Firebase 控制台取得
// 為了演示，我們使用佔位符。請更換為你自己的專案設定。
  const firebaseConfig = {
    apiKey: "AIzaSyDzN_IssG5rmwMqbIx80VJJ917lEniYgDA",
    authDomain: "travel-11318.firebaseapp.com",
    projectId: "travel-11318",
    storageBucket: "travel-11318.firebasestorage.app",
    messagingSenderId: "184290725381",
    appId: "1:184290725381:web:1b97eece3666a0ea93d66c"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 啟用離線數據持久化
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("離線模式失敗：多個分頁同時開啟");
    } else if (err.code === 'unimplemented') {
      console.warn("離線模式失敗：瀏覽器不支援");
    }
  });
}

// 實作自動匿名登入
export const initAuth = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    console.log("已匿名登入，用戶 ID:", userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error("匿名登入出錯:", error);
    return null;
  }
};
