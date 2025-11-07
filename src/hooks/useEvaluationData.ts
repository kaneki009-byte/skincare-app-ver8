import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { EvaluationRecord } from '../types/evaluation';
import { summarizeMonthly } from '../lib/summaries';

interface HookResult {
  records: EvaluationRecord[];
  monthlySummary: ReturnType<typeof summarizeMonthly>;
  loading: boolean;
  error: string | null;
}

export const useEvaluationData = (): HookResult => {
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const evaluationsRef = collection(db, 'evaluations');
    const q = query(evaluationsRef, orderBy('assessmentDate', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const mapped = snapshot.docs.map((doc) => {
          const data = doc.data();
          const timestamp = data.assessmentDate?.toDate?.() ?? data.assessmentDate ?? data.createdAt?.toDate?.();
          const createdAt = data.createdAt?.toDate?.() ?? new Date();
          return {
            id: doc.id,
            assessor: data.assessor ?? '未設定',
            boneProtection: data.boneProtection ?? 'na',
            incontinenceCare: data.incontinenceCare ?? 'na',
            notes: data.notes ?? '',
            assessmentDate: (timestamp instanceof Date ? timestamp : new Date(timestamp)).toISOString(),
            createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
            createdBy: data.createdBy
          } satisfies EvaluationRecord;
        });
        setRecords(mapped);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Firestoreの読み込みに失敗しました');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const monthlySummary = useMemo(() => summarizeMonthly(records), [records]);

  return { records, monthlySummary, loading, error };
};
