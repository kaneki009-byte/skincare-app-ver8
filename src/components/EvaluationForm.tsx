import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CareStatus, EvaluationPayload } from '../types/evaluation';

interface Props {
  assessorOptions: string[];
  loading: boolean;
  onSave: (payload: EvaluationPayload) => Promise<void> | void;
}

const illustrationModules = import.meta.glob('/public/illustrations/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
});

const illustrationSources = Object.values(illustrationModules) as string[];
const ASSESSOR_STORAGE_KEY = 'evaluationForm.assessors';

const formatAssessorList = (values: unknown[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  values.forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  });

  return normalized;
};

const loadStoredAssessors = (): string[] | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ASSESSOR_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return formatAssessorList(parsed);
  } catch {
    return null;
  }
};

const persistAssessors = (values: string[]): string[] => {
  const normalized = formatAssessorList(values);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ASSESSOR_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.error('ローカルストレージへの評価者保存に失敗しました', error);
    }
  }

  return normalized;
};

const statusOptions: { value: CareStatus; label: string }[] = [
  { value: 'done', label: 'できている' },
  { value: 'not_done', label: 'できていない' },
  { value: 'na', label: '該当なし' }
];

const EvaluationForm = ({ assessorOptions, loading, onSave }: Props) => {
  const [storedAssessors, setStoredAssessors] = useState<string[]>([]);
  const availableAssessors = useMemo(
    () => (storedAssessors.length ? storedAssessors : assessorOptions),
    [storedAssessors, assessorOptions]
  );
  const [mode, setMode] = useState<'select' | 'custom'>(assessorOptions.length ? 'select' : 'custom');
  const [selectedAssessor, setSelectedAssessor] = useState('');
  const [customAssessor, setCustomAssessor] = useState('');
  const [boneProtection, setBoneProtection] = useState<CareStatus>('done');
  const [incontinenceCare, setIncontinenceCare] = useState<CareStatus>('done');
  const [notes, setNotes] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dailyIllustration, setDailyIllustration] = useState<string | null>(null);

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
    const stored = loadStoredAssessors();
    if (stored) {
      setStoredAssessors(stored);
      return;
    }

    if (assessorOptions.length) {
      setStoredAssessors(persistAssessors(assessorOptions));
    } else {
      setStoredAssessors([]);
    }
  }, [assessorOptions]);

  useEffect(() => {
    if (!availableAssessors.length) {
      setSelectedAssessor('');
      return;
    }

    if (!selectedAssessor || !availableAssessors.includes(selectedAssessor)) {
      setSelectedAssessor(availableAssessors[0]);
    }
  }, [availableAssessors, selectedAssessor]);

  useEffect(() => {
    if (!availableAssessors.length && mode === 'select') {
      setMode('custom');
    }
  }, [availableAssessors.length, mode]);

  useEffect(() => {
    if (!illustrationSources.length || typeof window === 'undefined') {
      return;
    }

    const key = 'evaluationForm.dailyIllustration';
    const today = new Date().toISOString().split('T')[0];

    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached) as { date: string; image: string };
        if (parsed?.date === today && parsed.image) {
          setDailyIllustration(parsed.image);
          return;
        }
      }
    } catch {
      // Ignore malformed cache and refresh selection.
    }

    const randomIndex = Math.floor(Math.random() * illustrationSources.length);
    const selected = illustrationSources[randomIndex] ?? null;

    if (selected) {
      setDailyIllustration(selected);
      localStorage.setItem(key, JSON.stringify({ date: today, image: selected }));
    }
  }, []);

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
    setCustomAssessor('');

    if (mode === 'custom') {
      setStoredAssessors((prev) => {
        if (prev.includes(assessor)) {
          return prev;
        }
        return persistAssessors([...prev, assessor]);
      });
      setSelectedAssessor(assessor);
    }
  };

  const handleAssessorDelete = (target: string) => {
    if (!target || typeof window === 'undefined') {
      return;
    }

    const confirmed = window.confirm(`「${target}」を本当に削除しますか？`);
    if (!confirmed) {
      return;
    }

    setStoredAssessors((prev) => {
      const next = persistAssessors(prev.filter((name) => name !== target));
      if (selectedAssessor === target) {
        setSelectedAssessor(next[0] ?? '');
      }
      return next;
    });
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      {dailyIllustration && (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src={dailyIllustration}
            alt="癒やし系イラスト"
            style={{ width: '150px', height: 'auto' }}
          />
        </div>
      )}
      <section className="card-section">
        <div className="section-header">
          <h2>評価者情報</h2>
          <div className="chip-group">
            <button
              type="button"
              className={`chip ${mode === 'select' ? 'selected' : ''}`}
              onClick={() => setMode('select')}
              disabled={!availableAssessors.length}
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
              {availableAssessors.map((option) => (
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

        {storedAssessors.length > 0 && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '0.9rem',
              padding: '0.75rem 1rem',
              background: 'rgba(15, 23, 42, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>登録済み評価者（×で削除）</span>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {storedAssessors.map((name) => (
                <li
                  key={name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <span>{name}</span>
                  <button
                    type="button"
                    onClick={() => handleAssessorDelete(name)}
                    aria-label={`${name} を削除`}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#dc2626',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      lineHeight: 1,
                      padding: '0 0.2rem'
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
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
