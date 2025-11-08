import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
  type ChartData,
  type ChartOptions
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { CareStatus, EvaluationRecord, MonthlySummary } from '../types/evaluation';
import { deleteEvaluationRecord, type DeleteEvaluationHandler } from '../hooks/useEvaluationData';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  loading: boolean;
  monthlySummary: MonthlySummary[];
  latestRecords: EvaluationRecord[];
  allRecords: EvaluationRecord[];
}

type CareField = 'boneProtection' | 'incontinenceCare';

const getMonthKeyFromDate = (dateInput?: string) => {
  if (!dateInput) {
    return '';
  }
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

const careStatusLabels: Record<CareStatus, string> = {
  done: 'できている',
  not_done: 'できていない',
  na: '該当なし'
};

type StatusCounts = {
  done: number;
  notDone: number;
  na: number;
  total: number;
};

type StatusChartData = ChartData<'doughnut', number[], string>;
type BuildChartDataFn = (counts: StatusCounts) => StatusChartData;

const statusChartLabels = ['できている', 'できていない', '該当なし'];
const statusChartColors = ['#1ab286', '#f97316', '#94a3b8'];

const createStatusCounts = (): StatusCounts => ({
  done: 0,
  notDone: 0,
  na: 0,
  total: 0
});

const incrementStatus = (counts: StatusCounts, status: CareStatus) => {
  counts.total += 1;
  switch (status) {
    case 'done':
      counts.done += 1;
      break;
    case 'not_done':
      counts.notDone += 1;
      break;
    default:
      counts.na += 1;
      break;
  }
};

const summarizeStatusByField = (records: EvaluationRecord[], field: CareField): StatusCounts =>
  records.reduce((acc, record) => {
    incrementStatus(acc, record[field]);
    return acc;
  }, createStatusCounts());

const percentage = (value: number, total: number) => (total ? Number(((value / total) * 100).toFixed(1)) : 0);

const buildStatusChartData: BuildChartDataFn = (counts) => ({
  labels: statusChartLabels,
  datasets: [
    {
      data: [percentage(counts.done, counts.total), percentage(counts.notDone, counts.total), percentage(counts.na, counts.total)],
      backgroundColor: statusChartColors,
      hoverOffset: 6
    }
  ]
});

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      callbacks: {
        label: (context) => `${context.label ?? ''}: ${context.formattedValue}%`
      }
    }
  }
};

const formatDateTime = (isoDate?: string) => {
  if (!isoDate) {
    return '未設定';
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '未設定';
  }
  return dateTimeFormatter.format(date);
};

const formatCareStatus = (status: CareStatus) => careStatusLabels[status] ?? '―';

const formatPercentageLabel = (value: number, total: number) => `${percentage(value, total).toFixed(1)}%`;

const Dashboard = ({ loading, monthlySummary, latestRecords, allRecords }: Props) => {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const monthOptions = useMemo(() => {
    return [...monthlySummary]
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .map((summary) => ({ value: summary.monthKey, label: summary.label }));
  }, [monthlySummary]);

  useEffect(() => {
    if (selectedMonth && !monthOptions.some((option) => option.value === selectedMonth)) {
      setSelectedMonth('');
    }
  }, [monthOptions, selectedMonth]);

  const fallbackMonth = monthOptions[0]?.value ?? '';
  const activeMonth = selectedMonth || fallbackMonth;
  const activeMonthLabel = monthOptions.find((option) => option.value === activeMonth)?.label ?? '該当なし';

  const recordsInSelectedMonth = useMemo(() => {
    if (!activeMonth) {
      return [];
    }
    return allRecords.filter(
      (record) => getMonthKeyFromDate(record.assessmentDate || record.createdAt) === activeMonth
    );
  }, [activeMonth, allRecords]);

  const boneCounts = useMemo(
    () => summarizeStatusByField(recordsInSelectedMonth, 'boneProtection'),
    [recordsInSelectedMonth]
  );
  const incontinenceCounts = useMemo(
    () => summarizeStatusByField(recordsInSelectedMonth, 'incontinenceCare'),
    [recordsInSelectedMonth]
  );

  const boneChartData = useMemo(() => buildStatusChartData(boneCounts), [boneCounts]);
  const incontinenceChartData = useMemo(
    () => buildStatusChartData(incontinenceCounts),
    [incontinenceCounts]
  );

  const handleDelete = useCallback<DeleteEvaluationHandler>(
    async (evaluationId) => {
      if (!evaluationId) {
        return;
      }

      const confirmed = window.confirm('この記録を削除しますか？');
      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(evaluationId);
        await deleteEvaluationRecord(evaluationId);
      } catch (err) {
        console.error(err);
        alert('削除に失敗しました。時間をおいて再度お試しください。');
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  if (loading) {
    return <p className="subtle">集計中...</p>;
  }

  if (!allRecords.length) {
    return <p className="subtle">まだ記録がありません。フォームから登録してください。</p>;
  }

  const monthSummaryText = recordsInSelectedMonth.length
    ? `${activeMonthLabel} / ${recordsInSelectedMonth.length}件`
    : `${activeMonthLabel} / 記録なし`;

  return (
    <div className="dashboard-grid">
      <section className="card">
        <div className="section-header">
          <h2>対象月の切り替え</h2>
          {monthOptions.length > 0 && (
            <label className="field month-filter">
              <span>月を選択</span>
              <select value={activeMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <p className="subtle">表示中: {monthSummaryText}</p>
      </section>

      <section className="card">
        <h2>A. 骨突出/医療機器あり（アドプロテープ使用）</h2>
        <div className="chart-wrapper doughnut">
          {boneCounts.total ? (
            <Doughnut data={boneChartData} options={doughnutOptions} />
          ) : (
            <p className="subtle">選択した月の記録がありません。</p>
          )}
          <div className="totals">
            <p>
              できている: <strong>{formatPercentageLabel(boneCounts.done, boneCounts.total)}</strong> ({boneCounts.done}件)
            </p>
            <p>
              できていない:{' '}
              <strong>{formatPercentageLabel(boneCounts.notDone, boneCounts.total)}</strong> ({boneCounts.notDone}件)
            </p>
            <p>
              該当なし: <strong>{formatPercentageLabel(boneCounts.na, boneCounts.total)}</strong> ({boneCounts.na}件)
            </p>
            <p>
              評価件数: <strong>{boneCounts.total}</strong>
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>B. 失禁あり（ワセリン使用）</h2>
        <div className="chart-wrapper doughnut">
          {incontinenceCounts.total ? (
            <Doughnut data={incontinenceChartData} options={doughnutOptions} />
          ) : (
            <p className="subtle">選択した月の記録がありません。</p>
          )}
          <div className="totals">
            <p>
              できている:{' '}
              <strong>{formatPercentageLabel(incontinenceCounts.done, incontinenceCounts.total)}</strong> ({incontinenceCounts.done}件)
            </p>
            <p>
              できていない:{' '}
              <strong>{formatPercentageLabel(incontinenceCounts.notDone, incontinenceCounts.total)}</strong> ({incontinenceCounts.notDone}件)
            </p>
            <p>
              該当なし:{' '}
              <strong>{formatPercentageLabel(incontinenceCounts.na, incontinenceCounts.total)}</strong> ({incontinenceCounts.na}件)
            </p>
            <p>
              評価件数: <strong>{incontinenceCounts.total}</strong>
            </p>
          </div>
        </div>
      </section>

      <section className="card wide">
        <h2>詳細表</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>評価日</th>
                <th>評価者</th>
                <th>骨保護</th>
                <th>失禁ケア</th>
                <th>自由記載欄</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {latestRecords.map((record) => {
                const noteText = record.notes || '（記載なし）';
                const busy = deletingId === record.id;
                return (
                  <tr key={record.id}>
                    <td>{formatDateTime(record.assessmentDate || record.createdAt)}</td>
                    <td>{record.assessor}</td>
                    <td>{formatCareStatus(record.boneProtection)}</td>
                    <td>{formatCareStatus(record.incontinenceCare)}</td>
                    <td title={noteText}>{noteText}</td>
                    <td>
                      <button
                        type="button"
                        className="chip"
                        onClick={() => handleDelete(record.id)}
                        disabled={busy}
                        style={{ borderColor: '#f97316', color: '#f97316' }}
                      >
                        {busy ? '削除中…' : '削除'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
