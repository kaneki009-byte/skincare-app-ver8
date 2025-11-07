import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CareStatus, EvaluationPayload } from '../types/evaluation';

interface Props {
  assessorOptions: string[];
  loading: boolean;
  onSave: (payload: EvaluationPayload) => Promise<void> | void;
}

const statusOptions: { value: CareStatus; label: string }[] = [
  { value: 'done', label: 'できている' },
  { value: 'not_done', label: 'できていない' },
  { value: 'na', label: '該当なし' }
];

const EvaluationForm = ({ assessorOptions, loading, onSave }: Props) => {
  const [mode, setMode] = useState<"select" | "custom">(
    assessorOptions.length ? 'select' : 'custom'
  );
  const [selectedAssessor, setSelectedAssessor] = useState('');
  const [customAssessor, setCustomAssessor] = useState('');
  const [boneProtection, setBoneProtection] = useState<CareStatus>('done');
  const [incontinenceCare, setIncontinenceCare] = useState<CareStatus>('done');
  const [notes, setNotes] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const assessorLabel = useMemo(
    () => (mode === 'select' ? '評価者（選択）' : '評価者（新規入力）'),
    [mode]
  );

  const bmiValue = useMemo(() => {
    const height = parseFloat(heightCm);
    const weight = parseFloat(weightKg);

    if (!height || !weight) {
      return null;
    }

    const heightMeters = height / 100;
    if (heightMeters <= 0) {
      return null;
    }

    const bmi = weight / (heightMeters * heightMeters);
    return Number.isFinite(bmi) ? bmi : null;
  }, [heightCm, weightKg]);

  const isBmiEligible = bmiValue !== null && bmiValue <= 18.5;

  useEffect(() => {
    if (assessorOptions.length && !selectedAssessor) {
      setSelectedAssessor(assessorOptions[0]);
    }
  }, [assessorOptions, selectedAssessor]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const assessor = mode === 'select' ? selectedAssessor : customAssessor.trim();

    if (!assessor) {
      setError('評価者名を入力または選択してください。');
      return;
    }

    const payload: EvaluationPayload = {
      assessor,
      boneProtection,
      incontinenceCare,
      notes: notes.trim(),
      assessmentDate: new Date().toISOString()
    };

    await onSave(payload);

    setNotes('');
    setBoneProtection('done');
    setIncontinenceCare('done');
    setHeightCm('');
    setWeightKg('');
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <section className="card-section">
        <div className="section-header">
          <h2>評価者情報</h2>
          <div className="chip-group">
            <button
              type="button"
              className={`chip ${mode === 'select' ? 'selected' : ''}`}
              onClick={() => setMode('select')}
              disabled={!assessorOptions.length}
            >
              既存名簿
            </button>
            <button
              type="button"
              className={`chip ${mode === 'custom' ? 'selected' : ''}`}
              onClick={() => setMode('custom')}
            >
              新規入力
            </button>
          </div>
        </div>

        {mode === 'select' ? (
          <label className="field">
            <span>{assessorLabel}</span>
            <select value={selectedAssessor} onChange={(e) => setSelectedAssessor(e.target.value)}>
              <option value="">選択してください</option>
              {assessorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            <span>{assessorLabel}</span>
            <input
              type="text"
              value={customAssessor}
              placeholder="例：山田"
              onChange={(e) => setCustomAssessor(e.target.value)}
              autoComplete="name"
            />
          </label>
        )}

      </section>

      <section className="card-section">
        <h2>評価項目</h2>
        <div className="bmi-panel">
          <div className="field">
            <span>身長 (cm)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="例：160"
            />
          </div>
          <div className="field">
            <span>体重 (kg)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="例：45.5"
            />
          </div>
          {bmiValue !== null && (
            <div className="bmi-result">
              <p>
                BMI: <strong>{bmiValue.toFixed(1)}</strong>
              </p>
              <span className={`bmi-flag ${isBmiEligible ? 'alert' : 'muted'}`}>
                {isBmiEligible ? '評価対象です' : '評価対象外です'}
              </span>
            </div>
          )}
        </div>
        <div className="field">
          <div className="field-label">
            <strong>A. 骨突出/医療機器あり</strong>
            <p>アドプロテープ使用</p>
          </div>
          <div className="status-options">
            {statusOptions.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="boneProtection"
                  value={option.value}
                  checked={boneProtection === option.value}
                  onChange={() => setBoneProtection(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-label">
            <strong>B. 失禁あり</strong>
            <p>ワセリン使用</p>
          </div>
          <div className="status-options">
            {statusOptions.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="incontinenceCare"
                  value={option.value}
                  checked={incontinenceCare === option.value}
                  onChange={() => setIncontinenceCare(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <label className="field">
          <span>C. 自由記録欄（個人情報は入力しない）</span>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ケア状況や共有事項を記載"
          />
        </label>
      </section>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="primary" disabled={loading}>
        {loading ? '送信中...' : '保存'}
      </button>
    </form>
  );
};

export default EvaluationForm;
