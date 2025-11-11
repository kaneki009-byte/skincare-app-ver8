import { FormEvent, useState } from 'react';

const ACCESS_KEY = (import.meta.env.VITE_APP_ACCESS_KEY ?? '').trim();
const STORAGE_KEY = 'auth';

type LoginGateProps = {
  onLoginSuccess?: () => void;
};

const LoginGate = ({ onLoginSuccess }: LoginGateProps) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ACCESS_KEY) {
      setError('アクセスキーが設定されていません。管理者に連絡してください。');
      return;
    }

    if (password.trim() !== ACCESS_KEY) {
      setError('パスワードが違います。');
      return;
    }

    if (typeof window === 'undefined') {
      setError('ブラウザ環境でアクセスしてください。');
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
      setError(null);
      setPassword('');
      onLoginSuccess?.();
    } catch (err) {
      console.error('Failed to persist auth flag', err);
      setError('認証情報の保存に失敗しました。');
    }
  };

  return (
    <div className="page login-page">
      <div className="card login-card">
        <h1>メンバー専用ログイン</h1>
        <p className="subtle">共有されたアクセスキーを入力してください。</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-password">アクセスキー</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="パスワードを入力"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary">
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginGate;
