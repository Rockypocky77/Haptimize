import {
  db,
  doc,
  getDocFromServer,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "@/lib/firebase/client";
import { getLocalDateString } from "@/lib/date";

/**
 * Computes the current streak (consecutive days meeting the threshold)
 * and writes it to dailyStats/{uid}. Returns the new streak count.
 * Counts backwards from today; if today doesn't meet the goal, starts from yesterday.
 * Handles logs missing completionPct by computing from completedHabitIds.
 */
export async function updateStreak(
  uid: string,
  streakThreshold: number
): Promise<number> {
  let totalHabits = 0;
  try {
    const habitsSnap = await getDocs(
      query(
        collection(db, "habits", uid, "items"),
        where("active", "==", true)
      )
    );
    totalHabits = habitsSnap.size;
  } catch {
    /* ignore */
  }

  let count = 0;
  const date = new Date();

  for (let i = 0; i < 60; i++) {
    const dateStr = getLocalDateString(date);
    const snap = await getDocFromServer(doc(db, "habitLogs", uid, "daily", dateStr));

    let pct: number;
    if (!snap.exists()) {
      pct = 0; // No data = 0% done (app not opened that day)
    } else {
      const data = snap.data();
      pct = data?.completionPct;
      if (pct == null && totalHabits > 0 && Array.isArray(data?.completedHabitIds)) {
        pct = Math.round(
          (data.completedHabitIds.length / totalHabits) * 100
        );
      } else if (pct == null) {
        pct = 0;
      }
    }

    const meetsGoal = pct >= streakThreshold;
    if (!meetsGoal) {
      // Streak = consecutive days including today; if today doesn't meet, streak breaks
      break;
    }
    count++;
    date.setDate(date.getDate() - 1);
  }

  await setDoc(
    doc(db, "dailyStats", uid),
    { currentStreak: count },
    { merge: true }
  );
  return count;
}
