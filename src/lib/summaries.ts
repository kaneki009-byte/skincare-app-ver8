import type { EvaluationRecord, MonthlySummary } from '../types/evaluation';

const monthFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'short'
});

export const summarizeMonthly = (records: EvaluationRecord[]): MonthlySummary[] => {
  const summaryMap = new Map<string, MonthlySummary>();

  records.forEach((record) => {
    const sourceDate = record.assessmentDate || record.createdAt;
    const date = sourceDate ? new Date(sourceDate) : new Date();
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = monthFormatter.format(date);

    if (!summaryMap.has(monthKey)) {
      summaryMap.set(monthKey, {
        monthKey,
        label,
        total: 0,
        done: 0,
        notDone: 0,
        na: 0
      });
    }

    const summary = summaryMap.get(monthKey)!;
    summary.total += 1;
    summary.done += Number(record.boneProtection === 'done') + Number(record.incontinenceCare === 'done');
    summary.notDone += Number(record.boneProtection === 'not_done') + Number(record.incontinenceCare === 'not_done');
    summary.na += Number(record.boneProtection === 'na') + Number(record.incontinenceCare === 'na');
  });

  return Array.from(summaryMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
};
