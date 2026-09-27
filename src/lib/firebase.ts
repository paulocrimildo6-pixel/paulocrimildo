import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export interface UserProfileData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  streakDays: number;
  lastStudyDate: string; // YYYY-MM-DD
  lastAccessAt: string;  // ISO string
  translationCount: number;
  voiceCount: number;
  loginMethod: "google.com" | "password" | "other";
  isBlocked?: boolean;
  isAdmin?: boolean;
  subscription_plan?: "free" | "premium";
  subscription_status?: "active" | "canceled" | "refunded" | "chargeback" | "refused" | "none";
  cakto_customer_id?: string;
  cakto_product_id?: string;
  cakto_subscription_id?: string;
  subscription_started_at?: string;
  subscription_expires_at?: string;
  isPremium?: boolean;
  createdAt?: string;
}

// Fetch Authoritative Subscription Status from Backend API
export async function fetchBackendSubscription(email: string): Promise<any> {
  try {
    const res = await fetch(`/api/subscription/status?email=${encodeURIComponent(email)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[Subscription] Erro ao consultar backend de assinaturas:", err);
  }
  return null;
}

// User Profile Firestore Sync
export async function syncUserProfile(user: User): Promise<UserProfileData> {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const today = new Date().toISOString().split("T")[0];
  const nowIso = new Date().toISOString();

  const providerId = user.providerData[0]?.providerId || "password";
  const loginMethod = providerId === "google.com" ? "google.com" : "password";

  // Check verified subscription from backend source of truth
  let subData: any = null;
  if (user.email) {
    subData = await fetchBackendSubscription(user.email);
  }

  const isPremiumActive = subData?.isPremium ?? false;
  const subPlan = subData?.subscription_plan || "free";
  const subStatus = subData?.subscription_status || "none";

  if (!snap.exists()) {
    const newProfile: UserProfileData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split("@")[0] || "Estudante",
      photoURL: user.photoURL || null,
      emailVerified: user.emailVerified,
      streakDays: 1,
      lastStudyDate: today,
      lastAccessAt: nowIso,
      translationCount: 0,
      voiceCount: 0,
      loginMethod,
      isBlocked: false,
      isAdmin: user.email === "admin@lingoconversa.com" || user.email === "luiscristovaositoe755@gmail.com",
      subscription_plan: subPlan,
      subscription_status: subStatus,
      cakto_customer_id: subData?.cakto_customer_id || "",
      cakto_product_id: subData?.cakto_product_id || "",
      cakto_subscription_id: subData?.cakto_subscription_id || "",
      subscription_started_at: subData?.subscription_started_at || "",
      subscription_expires_at: subData?.subscription_expires_at || "",
      isPremium: isPremiumActive,
      createdAt: nowIso
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  } else {
    const existing = snap.data() as UserProfileData;
    
    // Check if blocked
    if (existing.isBlocked) {
      throw new Error("Sua conta foi temporariamente suspensa pelo administrador.");
    }

    const updates: Partial<UserProfileData> = {
      emailVerified: user.emailVerified,
      displayName: user.displayName || existing.displayName,
      photoURL: user.photoURL || existing.photoURL,
      lastAccessAt: nowIso,
      loginMethod: loginMethod
    };

    // Keep subscription status in sync with backend
    if (subData) {
      updates.subscription_plan = subPlan;
      updates.subscription_status = subStatus;
      updates.isPremium = isPremiumActive;
      if (subData.cakto_customer_id) updates.cakto_customer_id = subData.cakto_customer_id;
      if (subData.cakto_product_id) updates.cakto_product_id = subData.cakto_product_id;
      if (subData.cakto_subscription_id) updates.cakto_subscription_id = subData.cakto_subscription_id;
      if (subData.subscription_started_at) updates.subscription_started_at = subData.subscription_started_at;
      if (subData.subscription_expires_at) updates.subscription_expires_at = subData.subscription_expires_at;
    }

    // Calculate Streak
    if (existing.lastStudyDate !== today) {
      const lastDate = new Date(existing.lastStudyDate);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        updates.streakDays = (existing.streakDays || 0) + 1;
        updates.lastStudyDate = today;
      } else if (diffDays > 1) {
        updates.streakDays = 1;
        updates.lastStudyDate = today;
      }
    }

    await updateDoc(userRef, updates);
    return { ...existing, ...updates };
  }
}

// Increment Translation Count
export async function incrementTranslationCount(userId: string) {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const current = snap.data().translationCount || 0;
      await updateDoc(userRef, { translationCount: current + 1 });
    }
  } catch (e) {
    console.error("Erro ao incrementar contador:", e);
  }
}

// Increment Voice Count
export async function incrementVoiceCount(userId: string) {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const current = snap.data().voiceCount || 0;
      await updateDoc(userRef, { voiceCount: current + 1 });
    }
  } catch (e) {
    console.error("Erro ao incrementar contador de voz:", e);
  }
}

// Friendly Auth Error Messages in Portuguese
export function getFriendlyAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha incorretos. Verifique suas credenciais.";
    case "auth/email-already-in-use":
      return "Este e-mail já está cadastrado. Tente fazer login.";
    case "auth/weak-password":
      return "A senha deve ter pelo menos 6 caracteres.";
    case "auth/invalid-email":
      return "Endereço de e-mail inválido.";
    case "auth/popup-closed-by-user":
      return "O login via Google foi cancelado antes da conclusão.";
    case "auth/too-many-requests":
      return "Muitas tentativas malsucedidas. Tente novamente mais tarde.";
    case "auth/network-request-failed":
      return "Falha na conexão com a internet. Verifique sua rede.";
    default:
      return "Ocorreu um erro no sistema de autenticação. Tente novamente.";
  }
}
