// Shared bottom-sheet: slide-up open, drag-to-dismiss, slide-down close.
// children is a render-prop: children(dismiss) so the × button can animate too.

function BottomSheet({ onClose, maxHeight, children }) {
  const sheetRef = React.useRef(null);
  const dragRef  = React.useRef(null);
  const [closing, setClosing] = React.useState(false);

  function dismiss() {
    if (!closing) setClosing(true);
  }

  function handleTouchStart(e) {
    dragRef.current = {
      startY:         e.touches[0].clientY,
      startScrollTop: sheetRef.current?.scrollTop ?? 0,
    };
  }

  function handleTouchMove(e) {
    if (!dragRef.current || !sheetRef.current) return;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    if (dragRef.current.startScrollTop > 0 || dy <= 0) { dragRef.current = null; return; }
    sheetRef.current.style.transform  = `translateY(${dy}px)`;
    sheetRef.current.style.transition = 'none';
  }

  function handleTouchEnd(e) {
    if (!dragRef.current || !sheetRef.current) return;
    const dy = e.changedTouches[0].clientY - dragRef.current.startY;
    dragRef.current = null;
    if (dy > 120) {
      dismiss();
    } else {
      sheetRef.current.style.transition = 'transform 0.35s cubic-bezier(0.32,0.72,0,1)';
      sheetRef.current.style.transform  = 'translateY(0)';
    }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && dismiss()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end',
        background: 'rgba(0,0,0,0.35)',
        animation: closing ? 'none' : 'backdrop-in 0.25s ease forwards',
        opacity: closing ? 0 : undefined,
        transition: closing ? 'opacity 0.35s ease' : undefined,
      }}>
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTransitionEnd={e => { if (closing && e.propertyName === 'transform') onClose(); }}
        style={{
          background: 'var(--bg)', borderRadius: '20px 20px 0 0', width: '100%',
          maxHeight: maxHeight || '85vh', overflowY: 'auto', padding: '0 0 40px',
          overscrollBehavior: 'none',
          animation: closing ? 'none' : 'sheet-up 0.35s cubic-bezier(0.32,0.72,0,1) forwards',
          transform: closing ? 'translateY(100%)' : undefined,
          transition: closing ? 'transform 0.35s cubic-bezier(0.32,0.72,0,1)' : undefined,
        }}>
        {children(dismiss)}
      </div>
    </div>
  );
}
