import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import type { EvaluationRecord } from '../types/evaluation';
import { summarizeMonthly } from '../lib/summaries';

export type DeleteEvaluationHandler = (id: string) => Promise<void>;

interface HookResult {
  latestRecords: EvaluationRecord[];
  allRecords: EvaluationRecord[];
  monthlySummary: ReturnType<typeof summarizeMonthly>;
  loading: boolean;
  error: string | null;
}

export const deleteEvaluationRecord: DeleteEvaluationHandler = async (evaluationId) => {
  if (!evaluationId) return;
  const evaluationRef = doc(db, 'evaluations', evaluationId);
  await deleteDoc(evaluationRef);
};

const LATEST_EVALUATION_LIMIT = 10;

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const mapDocToRecord = (doc: QueryDocumentSnapshot<DocumentData>): EvaluationRecord => {
  const data = doc.data();
  const rawAssessor = normalizeString(data.assessor);
  const rawNotes = normalizeString(data.notes);
  const timestamp = data.assessmentDate?.toDate?.() ?? data.assessmentDate ?? data.createdAt?.toDate?.();
  const createdAt = data.createdAt?.toDate?.() ?? new Date();

  return {
    id: doc.id,
    assessor: rawAssessor || '未設定',
    boneProtection: data.boneProtection ?? 'na',
    incontinenceCare: data.incontinenceCare ?? 'na',
    notes: rawNotes,
    assessmentDate: (timestamp instanceof Date ? timestamp : new Date(timestamp)).toISOString(),
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
    createdBy: data.createdBy
  } satisfies EvaluationRecord;
};

export const useEvaluationData = (): HookResult => {
  const [latestRecords, setLatestRecords] = useState<EvaluationRecord[]>([]);
  const [allRecords, setAllRecords] = useState<EvaluationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [latestLoading, setLatestLoading] = useState(true);
  const [allLoading, setAllLoading] = useState(true);

  useEffect(() => {
    const evaluationsRef = collection(db, 'evaluations');
    const latestQuery = query(evaluationsRef, orderBy('createdAt', 'desc'), limit(LATEST_EVALUATION_LIMIT));

    const unsubscribe = onSnapshot(
      latestQuery,
      (snapshot) => {
        setLatestRecords(snapshot.docs.map(mapDocToRecord));
        setLatestLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Firestoreの読み込みに失敗しました');
        setLatestLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const evaluationsRef = collection(db, 'evaluations');
    const allQuery = query(evaluationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      allQuery,
      (snapshot) => {
        setAllRecords(snapshot.docs.map(mapDocToRecord));
        setAllLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Firestoreの読み込みに失敗しました');
        setAllLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const monthlySummary = useMemo(() => summarizeMonthly(allRecords), [allRecords]);

  return {
    latestRecords,
    allRecords,
    monthlySummary,
    loading: latestLoading || allLoading,
    error
  };
};
