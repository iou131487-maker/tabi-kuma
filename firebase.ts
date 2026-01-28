
// Fix: Use namespaced imports to bypass "no exported member" errors in environments with conflicting Firebase type definitions
import * as FirebaseApp from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import * as FirebaseFirestore from 'firebase/firestore';
import * as FirebaseStorage from 'firebase/storage';

// Destructure and cast to any to resolve missing named exports at compile time while maintaining modular logic
const { initializeApp, getApps, getApp } = FirebaseApp as any;
const { getAuth, signInAnonymously } = FirebaseAuth as any;
const { getFirestore, enableIndexedDbPersistence } = FirebaseFirestore as any;
const { getStorage } = FirebaseStorage as any;

// Define types as any to avoid direct type import errors from problematic modules
type Auth = any;
type Firestore = any;
type FirebaseStorage = any;

/**
 * 重要：請將下方的 config 內容替換為你在 Firebase Console 取得的實際內容
 * 1. 到 Firebase Console -> 專案設定 -> 一般 -> 你的應用程式
 * 2. 複製 firebaseConfig 物件並貼上到這裡
 */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", 
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};

let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let isConfigured = false;

// 精確檢查配置是否已正確填寫 (排除掉預設字串與範例字串)
const hasValidConfig = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" && 
  firebaseConfig.apiKey !== "AIzaSy..." &&
  !firebaseConfig.projectId.includes("YOUR_PROJECT_ID");

if (hasValidConfig) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isConfigured = true;

    // 啟動離線持久化儲存
    if (typeof window !== "undefined" && db) {
      enableIndexedDbPersistence(db).catch((err: any) => {
        if (err.code === 'failed-precondition') {
          console.warn("Firestore Persistence: 多個分頁開啟中，僅一個分頁能啟用持久化。");
        } else if (err.code === 'unimplemented') {
          console.warn("Firestore Persistence: 當前瀏覽器不支援離線儲存。");
        }
      });
    }
  } catch (error) {
    console.error("Firebase 初始化失敗，請檢查 Config 格式:", error);
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
    console.error("Firebase 匿名登入失敗 (可能是 Auth 未在後台啟用):", error);
    return null;
  }
};
