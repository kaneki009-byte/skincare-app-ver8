import { initializeApp } from 'firebase/app';
import {
  Timestamp,
  addDoc,
  collection,
  getFirestore,
  serverTimestamp
} from 'firebase/firestore';
import type { EvaluationPayload } from './types/evaluation';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

interface SavePayload extends EvaluationPayload {
  createdBy?: string;
}

export const saveEvaluation = async (payload: SavePayload) => {
  const docRef = collection(db, 'evaluations');
  const assessmentDate = Timestamp.fromDate(new Date(payload.assessmentDate));
  return addDoc(docRef, {
    assessor: payload.assessor,
    boneProtection: payload.boneProtection,
    incontinenceCare: payload.incontinenceCare,
    notes: payload.notes,
    assessmentDate,
    createdAt: serverTimestamp(),
    ...(payload.createdBy ? { createdBy: payload.createdBy } : {})
  });
};
