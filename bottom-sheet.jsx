// Shared bottom-sheet: slide-up open, drag-to-dismiss, slide-down close.
// children is a render-prop: children(dismiss) so the × button can animate out too.
//
// Animation is handled entirely via direct DOM manipulation (not React state) to avoid
// the CSS transition timing issue: when transition and transform change in the same React
// batch the browser uses the pre-batch transition spec ('none' from drag) and skips the
// animation, leaving the invisible overlay mounted and blocking all touches.

function BottomSheet({ onClose, maxHeight, children }) {
  const backdropRef  = React.useRef(null);
  const sheetRef     = React.useRef(null);
  const dragRef      = React.useRef(null);
  const dismissedRef = React.useRef(false);

  // Open: mount off-screen + transparent, rAF transitions to open position.
  // useLayoutEffect ensures initial styles are set before first paint.
  React.useLayoutEffect(() => {
    const bd = backdropRef.current;
    const sh = sheetRef.current;
    if (!bd || !sh) return;
    bd.style.opacity  = '0';
    sh.style.transform = 'translateY(100%)';
    const id = requestAnimationFrame(() => {
      bd.style.transition = 'opacity 0.25s ease';
      bd.style.opacity    = '1';
      sh.style.transition = 'transform 0.35s cubic-bezier(0.32,0.72,0,1)';
      sh.style.transform  = 'translateY(0)';
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function dismiss() {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    const bd = backdropRef.current;
    const sh = sheetRef.current;

    // Fade backdrop
    if (bd) {
      bd.style.transition = 'opacity 0.35s ease';
      bd.style.opacity    = '0';
    }

    if (!sh) { onClose(); return; }

    // Set transition spec first (overrides any 'none' left by drag),
    // then in next frame change the value so the browser sees the transition.
    sh.style.transition = 'transform 0.35s cubic-bezier(0.32,0.72,0,1)';
    requestAnimationFrame(() => {
      sh.style.transform = 'translateY(100%)';
      function onEnd(e) {
        if (e.propertyName === 'transform') {
          sh.removeEventListener('transitionend', onEnd);
          onClose();
        }
      }
      sh.addEventListener('transitionend', onEnd);
    });
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
    sheetRef.current.style.transition = 'none';
    sheetRef.current.style.transform  = `translateY(${dy}px)`;
  }

  function handleTouchEnd(e) {
    if (!dragRef.current || !sheetRef.current) return;
    const dy = e.changedTouches[0].clientY - dragRef.current.startY;
    dragRef.current = null;
    if (dy > 120) {
      dismiss();
    } else {
      // Snap back: set transition spec before the rAF value change
      sheetRef.current.style.transition = 'transform 0.35s cubic-bezier(0.32,0.72,0,1)';
      requestAnimationFrame(() => {
        sheetRef.current.style.transform = 'translateY(0)';
      });
    }
  }

  return ReactDOM.createPortal(
    <div
      ref={backdropRef}
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
      onClick={e => e.target === e.currentTarget && dismiss()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end',
        background: 'rgba(0,0,0,0.35)',
      }}>
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          background: 'var(--bg)', borderRadius: '20px 20px 0 0', width: '100%',
          border: '1px solid var(--border)', borderBottom: 'none',
          maxHeight: maxHeight || '85vh', overflowY: 'auto', padding: '0 0 40px',
          overscrollBehavior: 'none',
        }}>
        {children(dismiss)}
      </div>
    </div>,
    document.body
  );
}
