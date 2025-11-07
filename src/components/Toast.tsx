interface ToastProps {
  message: string;
  variant?: 'success' | 'error';
}

const Toast = ({ message, variant = 'success' }: ToastProps) => {
  const ariaLive = variant === 'error' ? 'assertive' : 'polite';
  const role = variant === 'error' ? 'alert' : 'status';
  return (
    <div className={`toast ${variant}`} role={role} aria-live={ariaLive}>
      {message}
    </div>
  );
};

export default Toast;
