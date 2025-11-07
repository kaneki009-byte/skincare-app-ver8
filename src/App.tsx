import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EvaluationForm from './components/EvaluationForm';
import Dashboard from './components/Dashboard';
import Toast from './components/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useEvaluationData } from './hooks/useEvaluationData';
import { saveEvaluation } from './firebase';
import type { EvaluationPayload } from './types/evaluation';

type ToastState = {
  message: string;
  variant: 'success' | 'error';
};

const AppShell = () => {
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { records, monthlySummary, error, loading } = useEvaluationData();

  const clearToastTimer = useCallback(() => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
  }, []);

  const showToast = useCallback((message: string, variant: ToastState['variant'] = 'success') => {
    clearToastTimer();
    setToast({ message, variant });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, [clearToastTimer]);

  useEffect(() => {
    return clearToastTimer;
  }, [clearToastTimer]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  const assessorOptions = useMemo(() => {
    const unique = new Set(records.map((record) => record.assessor));
    return Array.from(unique).sort();
  }, [records]);

  const handleSave = async (payload: EvaluationPayload) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await saveEvaluation({ ...payload, createdBy: user.uid });
      showToast('保存しました', 'success');
    } catch (err) {
      console.error(err);
      showToast('送信に失敗しました。時間をおいて再度お試しください。', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="page">
        <p className="subtle">認証待機中...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="app-header">
        <div>
          <h1>Skin Care Tracker ver.8</h1>
          <p className="subtle">BMI18.5以下/浮腫患者のスキンケア共有</p>
        </div>
        <nav className="tab-nav">
          <button
            type="button"
            className={activeTab === 'form' ? 'active' : ''}
            onClick={() => setActiveTab('form')}
          >
            評価フォーム
          </button>
          <button
            type="button"
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            ダッシュボード
          </button>
        </nav>
      </header>

      {activeTab === 'form' ? (
        <EvaluationForm
          assessorOptions={assessorOptions}
          onSave={handleSave}
          loading={isSubmitting}
        />
      ) : (
        <Dashboard
          loading={loading}
          monthlySummary={monthlySummary}
          records={records}
        />
      )}

      {toast && (
        <div className="toast-container">
          <Toast message={toast.message} variant={toast.variant} />
        </div>
      )}
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <AppShell />
  </AuthProvider>
);

export default App;
