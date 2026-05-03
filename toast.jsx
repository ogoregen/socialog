// Global toast system — call window.showToast('message', ms?, action?)
// action: { label: string, fn: () => void }

(function () {
  let _set = null;
  let _id  = 0;

  window.showToast = function (message, ms = 2200, action = null) {
    if (!_set) return;
    const id = ++_id;
    _set(prev => [...prev, { id, message, action }]);
    setTimeout(() => _set(prev => prev.filter(t => t.id !== id)), ms);
  };

  function Toaster() {
    const [toasts, setToasts] = React.useState([]);
    React.useEffect(() => { _set = setToasts; return () => { _set = null; }; }, []);
    if (!toasts.length) return null;
    return (
      <div style={{
        position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        pointerEvents: 'none', zIndex: 300,
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: 'var(--fg)', color: 'var(--bg)',
            borderRadius: 20, padding: '8px 6px 8px 18px',
            fontSize: 12, fontWeight: 500, letterSpacing: '0.01em',
            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 10,
            pointerEvents: t.action ? 'auto' : 'none',
          }}>
            <span>{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action.fn();
                  setToasts(prev => prev.filter(x => x.id !== t.id));
                }}
                style={{
                  background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 14,
                  color: 'var(--bg)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  padding: '4px 10px', letterSpacing: '0.04em',
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  Object.assign(window, { Toaster });
})();
