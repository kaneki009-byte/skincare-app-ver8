import { useEffect, useMemo, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { CareStatus, EvaluationRecord, MonthlySummary } from '../types/evaluation';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

interface Props {
  loading: boolean;
  monthlySummary: MonthlySummary[];
  latestRecords: EvaluationRecord[];
  allRecords: EvaluationRecord[];
}

const getMonthKeyFromDate = (dateInput: string | undefined) => {
  const date = dateInput ? new Date(dateInput) : new Date();
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
};

type StatusBuckets = {
  overall: StatusCounts;
  bone: StatusCounts;
  incontinence: StatusCounts;
};

const createStatusCounts = (): StatusCounts => ({
  done: 0,
  notDone: 0,
  na: 0
});

const incrementStatus = (counts: StatusCounts, status: CareStatus) => {
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

const statusChartLabels = ['できている', 'できていない', '該当なし'];
const statusChartColors = ['#1ab286', '#f97316', '#94a3b8'];

const buildStatusChartData = (counts: StatusCounts) => ({
  labels: statusChartLabels,
  datasets: [
    {
      data: [counts.done, counts.notDone, counts.na],
      backgroundColor: statusChartColors,
      hoverOffset: 4
    }
  ]
});

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

const Dashboard = ({ loading, monthlySummary, latestRecords, allRecords }: Props) => {
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    if (selectedMonth && !monthlySummary.some((summary) => summary.monthKey === selectedMonth)) {
      setSelectedMonth('');
    }
  }, [monthlySummary, selectedMonth]);

  const fallbackMonth = monthlySummary[monthlySummary.length - 1]?.monthKey ?? '';
  const activeMonth = selectedMonth || fallbackMonth;

  const recordsInSelectedMonth = useMemo(() => {
    if (!activeMonth) {
      return allRecords;
    }
    return allRecords.filter((record) => getMonthKeyFromDate(record.assessmentDate) === activeMonth);
  }, [allRecords, activeMonth]);

  const filteredSummary = useMemo(() => {
    if (!activeMonth) {
      return monthlySummary;
    }
    return monthlySummary.filter((summary) => summary.monthKey === activeMonth);
  }, [monthlySummary, activeMonth]);

  const statusBuckets = useMemo<StatusBuckets>(() => {
    const base: StatusBuckets = {
      overall: createStatusCounts(),
      bone: createStatusCounts(),
      incontinence: createStatusCounts()
    };

    return allRecords.reduce((acc, record) => {
      incrementStatus(acc.overall, record.boneProtection);
      incrementStatus(acc.overall, record.incontinenceCare);
      incrementStatus(acc.bone, record.boneProtection);
      incrementStatus(acc.incontinence, record.incontinenceCare);
      return acc;
    }, base);
  }, [allRecords]);

  const { overall: overallStatus, bone: boneStatus, incontinence: incontinenceStatus } = statusBuckets;

  const overallBalanceData = useMemo(() => buildStatusChartData(overallStatus), [overallStatus]);
  const boneChartData = useMemo(() => buildStatusChartData(boneStatus), [boneStatus]);
  const incontinenceChartData = useMemo(
    () => buildStatusChartData(incontinenceStatus),
    [incontinenceStatus]
  );

  const totalEvaluations = allRecords.length;
  const totalPoints = overallStatus.done + overallStatus.notDone + overallStatus.na;
  const bonePoints = boneStatus.done + boneStatus.notDone + boneStatus.na;
  const incontinencePoints =
    incontinenceStatus.done + incontinenceStatus.notDone + incontinenceStatus.na;
  const showMonthlyChart = recordsInSelectedMonth.length > 0;

  const barData = useMemo(() => {
    const labels = filteredSummary.map((summary) => summary.label);
    return {
      labels,
      datasets: [
        {
          label: 'できている',
          backgroundColor: '#1ab286',
          data: filteredSummary.map((summary) => summary.done)
        },
        {
          label: 'できていない',
          backgroundColor: '#f97316',
          data: filteredSummary.map((summary) => summary.notDone)
        },
        {
          label: '該当なし',
          backgroundColor: '#94a3b8',
          data: filteredSummary.map((summary) => summary.na)
        }
      ]
    };
  }, [filteredSummary]);

  if (loading) {
    return <p className="subtle">集計中...</p>;
  }

  if (!allRecords.length) {
    return <p className="subtle">まだ記録がありません。フォームから登録してください。</p>;
  }

  const monthOptions = monthlySummary.map((summary) => ({
    value: summary.monthKey,
    label: summary.label
  }));

  return (
    <div className="dashboard-grid">
      <section className="card">
        <div className="section-header">
          <h2>月次サマリー</h2>
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
        <div className="chart-wrapper">
          {showMonthlyChart ? (
            <Bar
              data={barData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom' },
                  title: { display: false }
                },
                scales: {
                  x: { stacked: true },
                  y: { stacked: true, beginAtZero: true }
                }
              }}
            />
          ) : (
            <p className="subtle">選択した月の記録がありません。</p>
          )}
        </div>
      </section>

      <section className="card">
        <h2>全体バランス</h2>
        <div className="chart-wrapper doughnut">
          <Doughnut
            data={overallBalanceData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'bottom' }
              }
            }}
          />
          <div className="totals">
            <p>登録件数: <strong>{totalEvaluations}</strong></p>
            <p>評価ポイント: <strong>{totalPoints}</strong></p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>A. 骨突出/医療機器あり（アドプロテープ使用）</h2>
        <div className="chart-wrapper doughnut">
          <Doughnut
            data={boneChartData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'bottom' }
              }
            }}
          />
          <div className="totals">
            <p>評価件数: <strong>{totalEvaluations}</strong></p>
            <p>骨保護評価: <strong>{bonePoints}</strong></p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>B. 失禁あり（ワセリン使用）</h2>
        <div className="chart-wrapper doughnut">
          <Doughnut
            data={incontinenceChartData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'bottom' }
              }
            }}
          />
          <div className="totals">
            <p>評価件数: <strong>{totalEvaluations}</strong></p>
            <p>失禁ケア評価: <strong>{incontinencePoints}</strong></p>
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
              </tr>
            </thead>
            <tbody>
              {latestRecords.map((record) => {
                const noteText = record.notes || '（記載なし）';
                return (
                  <tr key={record.id}>
                    <td>{formatDateTime(record.assessmentDate || record.createdAt)}</td>
                    <td>{record.assessor}</td>
                    <td>{formatCareStatus(record.boneProtection)}</td>
                    <td>{formatCareStatus(record.incontinenceCare)}</td>
                    <td title={noteText}>{noteText}</td>
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
