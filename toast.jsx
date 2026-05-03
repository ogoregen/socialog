// Global toast system — call window.showToast('message') from anywhere

(function () {
  let _set = null;
  let _id  = 0;

  window.showToast = function (message, ms = 2200) {
    if (!_set) return;
    const id = ++_id;
    _set(prev => [...prev, { id, message }]);
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
            borderRadius: 20, padding: '8px 18px',
            fontSize: 12, fontWeight: 500, letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}>
            {t.message}
          </div>
        ))}
      </div>
    );
  }

  Object.assign(window, { Toaster });
})();
