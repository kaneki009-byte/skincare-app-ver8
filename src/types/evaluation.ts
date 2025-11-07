export type CareStatus = 'done' | 'not_done' | 'na';

export interface EvaluationPayload {
  assessor: string;
  boneProtection: CareStatus;
  incontinenceCare: CareStatus;
  notes: string;
  assessmentDate: string; // ISO8601
}

export interface EvaluationRecord extends EvaluationPayload {
  id: string;
  createdAt: string;
  createdBy?: string;
}

export interface MonthlySummary {
  monthKey: string; // YYYY-MM
  label: string; // 2025年11月
  total: number;
  done: number;
  notDone: number;
  na: number;
}
