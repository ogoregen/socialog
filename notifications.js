// Push notification scheduling — plain JS, no JSX.
// Called on app open and on visibility change. Sends a list of timed
// notifications to the service worker, which fires them via setTimeout.

const NOTIF_KEY = 'socialog_notif';

function getNotifPrefs() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY)) || {}; }
  catch { return {}; }
}
function saveNotifPrefs(prefs) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
}

function msUntilTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const t = new Date(); t.setHours(h, m, 0, 0);
  return t - Date.now(); // negative means already past today
}

function completedInWeek(completions, monday) {
  if (!completions) return false;
  const end = new Date(monday); end.setDate(end.getDate() + 7);
  return Object.keys(completions).some(k => {
    const d = new Date(k + 'T00:00:00');
    return d >= monday && d < end && completions[k];
  });
}

function buildNotifications() {
  const prefs       = getNotifPrefs();
  const taskTime    = prefs.taskTime    || '09:00';
  const routineTime = prefs.routineTime || '20:00';

  const todos    = load('todos')    || [];
  const routines = load('routines') || [];
  const todayKey = today();
  const todayIdx = currentDayIndex();
  const monday   = getMondayOf(new Date());
  const dow      = new Date().getDay(); // 0=Sun

  const taskDelay    = msUntilTime(taskTime);
  const routineDelay = msUntilTime(routineTime);
  const out = [];

  // Task reminder
  if (taskDelay > 0) {
    const due = todos.filter(t => !t.done && t.dueDate && daysDiff(t.dueDate) <= 0);
    if (due.length > 0) {
      out.push({
        delay: taskDelay,
        title: 'Tasks need attention',
        body: due.length === 1 ? `"${due[0].text}" is due` : `${due.length} tasks are due or overdue`,
        tag: 'tasks',
      });
    }
  }

  // Daily routine reminder
  if (routineDelay > 0) {
    const pending = routines
      .filter(r => !r.weekly && r.days.includes(todayIdx))
      .filter(r => !(r.completions && r.completions[todayKey]));
    if (pending.length > 0) {
      out.push({
        delay: routineDelay,
        title: 'Keep your streak',
        body: pending.length === 1
          ? `Complete "${pending[0].title}" today`
          : `${pending.length} routines left for today`,
        tag: 'routines',
      });
    }

    // Weekly streak at risk — Thu through Sun
    if ([0, 4, 5, 6].includes(dow)) {
      const atRisk = routines.filter(r => r.weekly && !completedInWeek(r.completions, monday));
      if (atRisk.length > 0) {
        out.push({
          delay: routineDelay + 120000, // 2 min after routine reminder
          title: 'Weekly streak at risk',
          body: atRisk.length === 1
            ? `Complete "${atRisk[0].title}" before the week ends`
            : `${atRisk.length} weekly routines still to do this week`,
          tag: 'weekly',
        });
      }
    }
  }

  return out;
}

function scheduleNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;
  const notifications = buildNotifications();
  navigator.serviceWorker.ready.then(reg => {
    reg.active?.postMessage({ type: 'SCHEDULE_NOTIFICATIONS', notifications });
  });
}

Object.assign(window, { scheduleNotifications, getNotifPrefs, saveNotifPrefs });
