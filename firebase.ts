// @ts-ignore
import { initializeApp, getApp, getApps } from "firebase/app";
// @ts-ignore
import { getAuth, signInAnonymously } from "firebase/auth";
// @ts-ignore
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
// @ts-ignore
import { getStorage } from "firebase/storage";

const API_KEY = process.env.API_KEY;

const firebaseConfig = {
  apiKey: API_KEY, 
  authDomain: "travel-11318.firebaseapp.com",
  projectId: "travel-11318",
  storageBucket: "travel-11318.firebasestorage.app",
  messagingSenderId: "184290725381",
  appId: "1:184290725381:web:1b97eece3666a0ea93d66c"
};

let auth: any = null;
let db: any = null;
let storage: any = null;
let isConfigured = false;

// 檢查 API Key 是否有效
const hasValidConfig = typeof API_KEY === 'string' && API_KEY.trim().length > 20;

if (hasValidConfig) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    isConfigured = true;

    // 獨立初始化各個服務，避免單一服務(如Storage)未開啟導致全部失敗
    try {
      auth = getAuth(app);
    } catch (e) { console.warn("Auth 未就緒: 請確認後台已啟用 Authentication"); }

    try {
      db = getFirestore(app);
      if (typeof window !== "undefined") {
        enableIndexedDbPersistence(db).catch(() => {});
      }
    } catch (e) { console.warn("Firestore 未就緒: 請確認後台已建立 Database"); }

    try {
      storage = getStorage(app);
    } catch (e) { console.warn("Storage 未就緒: 這是 403 錯誤的主因，請在後台啟動 Storage 並點擊 Get Started"); }

    console.log("Firebase 核心已載入 ✨ (請確保 Console 後台已開啟 Auth/Firestore/Storage)");
  } catch (error) {
    console.error("Firebase 初始化失敗:", error);
    isConfigured = false;
  }
}

export { auth, db, storage, isConfigured };

export const initAuth = async () => {
  if (!auth) return null;
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error("Firebase 匿名登入失敗: 請檢查 Console -> Authentication 是否開啟了 Anonymous 供應商");
    return null;
  }
};