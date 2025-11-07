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
import type { EvaluationRecord, MonthlySummary } from '../types/evaluation';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

interface Props {
  loading: boolean;
  monthlySummary: MonthlySummary[];
  records: EvaluationRecord[];
}

const getMonthKeyFromDate = (dateInput: string | undefined) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const Dashboard = ({ loading, monthlySummary, records }: Props) => {
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    if (selectedMonth && !monthlySummary.some((summary) => summary.monthKey === selectedMonth)) {
      setSelectedMonth('');
    }
  }, [monthlySummary, selectedMonth]);

  const fallbackMonth = monthlySummary[monthlySummary.length - 1]?.monthKey ?? '';
  const activeMonth = selectedMonth || fallbackMonth;

  const filteredRecords = useMemo(() => {
    if (!activeMonth) {
      return records;
    }
    return records.filter((record) => getMonthKeyFromDate(record.assessmentDate) === activeMonth);
  }, [records, activeMonth]);

  const filteredSummary = useMemo(() => {
    if (!activeMonth) {
      return monthlySummary;
    }
    return monthlySummary.filter((summary) => summary.monthKey === activeMonth);
  }, [monthlySummary, activeMonth]);

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (acc, record) => {
        acc.total += 1;
        acc.done += Number(record.boneProtection === 'done') + Number(record.incontinenceCare === 'done');
        acc.notDone += Number(record.boneProtection === 'not_done') + Number(record.incontinenceCare === 'not_done');
        acc.na += Number(record.boneProtection === 'na') + Number(record.incontinenceCare === 'na');
        return acc;
      },
      { total: 0, done: 0, notDone: 0, na: 0 }
    );
  }, [filteredRecords]);

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

  const doughnutData = useMemo(() => {
    return {
      labels: ['できている', 'できていない', '該当なし'],
      datasets: [
        {
          data: [totals.done, totals.notDone, totals.na],
          backgroundColor: ['#1ab286', '#f97316', '#94a3b8'],
          hoverOffset: 4
        }
      ]
    };
  }, [totals]);

  if (loading) {
    return <p className="subtle">集計中...</p>;
  }

  if (!records.length) {
    return <p className="subtle">まだ記録がありません。フォームから登録してください。</p>;
  }

  if (!filteredRecords.length) {
    return <p className="subtle">選択した月の記録がありません。</p>;
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
        </div>
      </section>

      <section className="card">
        <h2>全体バランス</h2>
        <div className="chart-wrapper doughnut">
          <Doughnut
            data={doughnutData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'bottom' }
              }
            }}
          />
          <div className="totals">
            <p>登録件数: <strong>{filteredRecords.length}</strong></p>
            <p>評価ポイント: <strong>{totals.done + totals.notDone + totals.na}</strong></p>
          </div>
        </div>
      </section>

      <section className="card wide">
        <h2>詳細表</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>月</th>
                <th>件数</th>
                <th>できている</th>
                <th>できていない</th>
                <th>該当なし</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummary.map((summary) => (
                <tr key={summary.monthKey}>
                  <td>{summary.label}</td>
                  <td>{summary.total}</td>
                  <td>{summary.done}</td>
                  <td>{summary.notDone}</td>
                  <td>{summary.na}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
