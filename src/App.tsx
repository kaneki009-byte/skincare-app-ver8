import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dashboard from './components/Dashboard';
import EvaluationForm from './components/EvaluationForm';
import LoginGate from './components/LoginGate';
import SkincareGuidelines from './components/SkincareGuidelines';
import Toast from './components/Toast';
import { useEvaluationData } from './hooks/useEvaluationData';
import { saveEvaluation } from './firebase';
import type { EvaluationPayload } from './types/evaluation';

type ToastState = {
  message: string;
  variant: 'success' | 'error';
};

type TabKey = 'form' | 'dashboard' | 'guidelines';

const TAB_KEYS: TabKey[] = ['form', 'dashboard', 'guidelines'];

const AUTH_STORAGE_KEY = 'auth';

const getStoredAuthFlag = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  } catch (error) {
    console.error('認証状態の読み込みに失敗しました', error);
    return false;
  }
};

const getTabFromHash = (hash: string): TabKey => {
  const normalized = hash.replace(/^#/, '');
  return TAB_KEYS.includes(normalized as TabKey) ? (normalized as TabKey) : 'form';
};

const AppShell = () => {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window === 'undefined') {
      return 'form';
    }
    return getTabFromHash(window.location.hash);
  });
  const [authReady, setAuthReady] = useState<boolean>(() => typeof window === 'undefined');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => getStoredAuthFlag());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { latestRecords, allRecords, monthlySummary, error, loading } = useEvaluationData();

  useEffect(() => {
    setIsAuthenticated(getStoredAuthFlag());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncAuthState = () => {
      setIsAuthenticated(getStoredAuthFlag());
    };

    window.addEventListener('storage', syncAuthState);
    return () => {
      window.removeEventListener('storage', syncAuthState);
    };
  }, []);

  const navigateTo = useCallback((tab: TabKey) => {
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
    setActiveTab(tab);
  }, [setActiveTab]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleHashChange = () => {
      setActiveTab(getTabFromHash(window.location.hash));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setActiveTab]);

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
    const unique = new Set(allRecords.map((record) => record.assessor));
    return Array.from(unique).sort();
  }, [allRecords]);

  const handleSave = async (payload: EvaluationPayload) => {
    setIsSubmitting(true);
    try {
      await saveEvaluation(payload);
      showToast('保存しました', 'success');
    } catch (err) {
      console.error(err);
      showToast('送信に失敗しました。時間をおいて再度お試しください。', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(getStoredAuthFlag());
  }, []);

  if (!authReady) {
    return (
      <div className="page">
        <p className="subtle">認証待機中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginGate onLoginSuccess={handleLoginSuccess} />;
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
            onClick={() => navigateTo('form')}
          >
            評価フォーム
          </button>
          <button
            type="button"
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => navigateTo('dashboard')}
          >
            ダッシュボード
          </button>
          <button
            type="button"
            className={activeTab === 'guidelines' ? 'active' : ''}
            onClick={() => navigateTo('guidelines')}
          >
            スキンケア指針
          </button>
        </nav>
      </header>

      {activeTab === 'form' && (
        <EvaluationForm
          assessorOptions={assessorOptions}
          onSave={handleSave}
          loading={isSubmitting}
        />
      )}

      {activeTab === 'dashboard' && (
        <Dashboard
          loading={loading}
          monthlySummary={monthlySummary}
          latestRecords={latestRecords}
          allRecords={allRecords}
        />
      )}

      {activeTab === 'guidelines' && <SkincareGuidelines />}

      {toast && (
        <div className="toast-container">
          <Toast message={toast.message} variant={toast.variant} />
        </div>
      )}
    </div>
  );
};

const App = () => <AppShell />;

export default App;
