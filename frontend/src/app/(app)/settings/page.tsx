"use client";

import { useState, useCallback, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import {
  db,
  doc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} from "@/lib/firebase/client";
import { auth } from "@/lib/firebase/client";
import {
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from "firebase/auth";
import { Shield, User, Bell, Sparkles, Trash2, AlertTriangle, LogOut, Flame } from "lucide-react";
import { useDemoGuard } from "@/components/ui/DemoGate";
import { useTransition } from "@/contexts/TransitionContext";
import FadeIn from "@/components/ui/FadeIn";
import ClickSpark from "@/components/ui/ClickSpark";

export default function SettingsPage() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const { guardAction } = useDemoGuard();
  const { startTransition } = useTransition();
  const isEmailAuth = profile?.authProvider === "email";

  const [username, setUsername] = useState(profile?.displayName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [aiEnabled, setAiEnabled] = useState(profile?.aiEnabled ?? true);
  const [humanize, setHumanize] = useState(profile?.humanize ?? false);
  const [streakThreshold, setStreakThreshold] = useState(profile?.streakThreshold ?? 80);
  const [notifications, setNotifications] = useState(true);

  // Sync streak threshold when profile loads
  useEffect(() => {
    if (profile?.streakThreshold != null) {
      setStreakThreshold(profile.streakThreshold);
    }
  }, [profile?.streakThreshold]);

  // Sync aiEnabled and humanize when profile loads
  useEffect(() => {
    if (profile?.aiEnabled != null) setAiEnabled(profile.aiEnabled);
    if (profile?.humanize != null) setHumanize(profile.humanize);
  }, [profile?.aiEnabled, profile?.humanize]);
  const [emailUpdates, setEmailUpdates] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dangerInput, setDangerInput] = useState("");

  const saveStreakThreshold = useCallback(async () => {
    if (!guardAction("saving settings")) return;
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { streakThreshold });
      await refreshProfile();
      setMessage("Streak goal updated.");
    } catch {
      setMessage("Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [user, streakThreshold, refreshProfile, guardAction]);

  const saveAiAndHumanize = useCallback(async (ai: boolean, hum: boolean) => {
    if (!guardAction("saving settings")) return;
    if (!user) return;
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { aiEnabled: ai, humanize: hum });
      await refreshProfile();
    } catch {
      setMessage("Failed to save.");
    }
  }, [user, refreshProfile, guardAction]);

  const saveProfile = useCallback(async () => {
    if (!guardAction("saving settings")) return;
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      await updateProfile(user, { displayName: username });
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        displayName: username,
        aiEnabled,
        humanize,
        streakThreshold,
      });
      await refreshProfile();
      setMessage("Settings saved.");
    } catch {
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }, [user, username, aiEnabled, humanize, streakThreshold, refreshProfile]);

  const changePassword = useCallback(async () => {
    if (!guardAction("changing password")) return;
    if (!user || !user.email || !isEmailAuth) return;
    setSaving(true);
    setMessage("");
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password updated.");
    } catch (err: unknown) {
      setMessage(
        err instanceof Error ? err.message : "Failed to update password."
      );
    } finally {
      setSaving(false);
    }
  }, [user, isEmailAuth, currentPassword, newPassword]);

  const wipeData = useCallback(async () => {
    if (!guardAction("wiping data")) return;
    if (!user) return;
    try {
      const uid = user.uid;

      // 1. Habits: habits/{uid}/items
      const habitsRef = collection(db, "habits", uid, "items");
      const habitsSnap = await getDocs(habitsRef);
      for (const d of habitsSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 2. Habit logs (graph data): habitLogs/{uid}/daily
      const habitLogsRef = collection(db, "habitLogs", uid, "daily");
      const habitLogsSnap = await getDocs(habitLogsRef);
      for (const d of habitLogsSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 3. Reminders: casual and dated
      const casualRef = collection(db, "reminders", uid, "casual");
      const casualSnap = await getDocs(casualRef);
      for (const d of casualSnap.docs) {
        await deleteDoc(d.ref);
      }
      const datedRef = collection(db, "reminders", uid, "dated");
      const datedSnap = await getDocs(datedRef);
      for (const d of datedSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 4. Daily stats (streak, etc.): dailyStats/{uid} doc and days subcollection
      const dailyStatsDaysRef = collection(db, "dailyStats", uid, "days");
      const daysSnap = await getDocs(dailyStatsDaysRef);
      for (const d of daysSnap.docs) {
        await deleteDoc(d.ref);
      }
      const dailyStatsDocRef = doc(db, "dailyStats", uid);
      await deleteDoc(dailyStatsDocRef).catch(() => {});

      setShowWipeModal(false);
      setDangerInput("");
      setMessage("All data has been wiped.");
    } catch {
      setMessage("Failed to wipe data.");
    }
  }, [user]);

  const deleteAccount = useCallback(async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await deleteDoc(userDocRef);
      await deleteUser(user);
      setShowDeleteModal(false);
      startTransition("/");
      await logout();
    } catch {
      setMessage(
        "Failed to delete account. You may need to re-authenticate first."
      );
      setShowDeleteModal(false);
    }
  }, [user, logout, startTransition]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <FadeIn delay={0}>
        <h1 className="text-2xl font-bold text-neutral-dark">Settings</h1>
      </FadeIn>

      {message && (
        <div className="bg-primary/10 text-primary text-sm rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      {/* Sign out */}
      <FadeIn delay={0.05}>
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogOut size={16} className="text-neutral-dark/60" />
            <div>
              <p className="text-sm font-semibold text-neutral-dark/70">
                Sign out
              </p>
              <p className="text-xs text-neutral-dark/40">
                End your session and return to the login page
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => { startTransition("/"); setTimeout(logout, 800); }}>
            Sign out
          </Button>
        </div>
      </Card>
      </FadeIn>

      {/* Profile */}
      <FadeIn delay={0.1}>
      <Card>
        <h3 className="text-sm font-semibold text-neutral-dark/70 mb-4 flex items-center gap-2">
          <User size={16} />
          Profile
        </h3>
        <div className="space-y-4">
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <div className="text-sm text-neutral-dark/50">
            Email: {profile?.email}
          </div>
          <Button onClick={saveProfile} loading={saving}>
            Save Profile
          </Button>
        </div>
      </Card>
      </FadeIn>

      {/* Password (email auth only) */}
      {isEmailAuth && (
        <FadeIn delay={0.15}>
        <Card>
          <h3 className="text-sm font-semibold text-neutral-dark/70 mb-4 flex items-center gap-2">
            <Shield size={16} />
            Change Password
          </h3>
          <div className="space-y-4">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              minLength={8}
            />
            <Button
              onClick={changePassword}
              loading={saving}
              disabled={!currentPassword || newPassword.length < 8}
            >
              Update Password
            </Button>
          </div>
        </Card>
        </FadeIn>
      )}

      {!isEmailAuth && (
        <FadeIn delay={0.15}>
        <Card>
          <h3 className="text-sm font-semibold text-neutral-dark/70 mb-2 flex items-center gap-2">
            <Shield size={16} />
            Password
          </h3>
          <p className="text-sm text-neutral-dark/50">
            You signed in with Google. Password is managed by your Google
            account.
          </p>
        </Card>
        </FadeIn>
      )}

      {/* Streak threshold */}
      <FadeIn delay={0.18}>
      <Card>
        <h3 className="text-sm font-semibold text-neutral-dark/70 mb-4 flex items-center gap-2">
          <Flame size={16} className="text-accent" />
          Streak Goal
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-neutral-dark/70 mb-2">
              Minimum completion: {streakThreshold}%
            </label>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={streakThreshold}
              onChange={(e) => setStreakThreshold(Number(e.target.value))}
              className="w-full h-2 rounded-full bg-primary-light/30 appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-neutral-dark/40 mt-1">
              Your streak counts when you complete at least this % of habits each day
            </p>
          </div>
          <Button onClick={saveStreakThreshold} loading={saving} size="sm">
            Save
          </Button>
        </div>
      </Card>
      </FadeIn>

      {/* AI toggle */}
      <FadeIn delay={0.2}>
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-primary" />
            <div>
              <p className="text-sm font-semibold text-neutral-dark/70">
                Hapti AI
              </p>
              <p className="text-xs text-neutral-dark/40">
                Enable AI assistant chat
              </p>
            </div>
          </div>
          <ClickSpark sparkColor="#fff" sparkSize={8} sparkRadius={14} className="inline-flex">
          <button
            onClick={() => {
              if (!guardAction("saving settings")) return;
              const next = !aiEnabled;
              setAiEnabled(next);
              saveAiAndHumanize(next, humanize);
            }}
            className={`
              w-12 h-7 rounded-full relative cursor-pointer
              ${aiEnabled ? "bg-primary" : "bg-neutral-dark/20"}
            `}
            style={{ transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 150ms ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <div
              className={`
                absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform
                ${aiEnabled ? "translate-x-6" : "translate-x-1"}
              `}
            />
          </button>
          </ClickSpark>
        </div>
      </Card>
      </FadeIn>

      {/* Humanize toggle */}
      {aiEnabled && (
      <FadeIn delay={0.22}>
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base">💬</span>
            <div>
              <p className="text-sm font-semibold text-neutral-dark/70">
                Humanize
              </p>
              <p className="text-xs text-neutral-dark/40">
                Hapti AI texts like a real person
              </p>
            </div>
          </div>
          <ClickSpark sparkColor="#fff" sparkSize={8} sparkRadius={14} className="inline-flex">
          <button
            onClick={() => {
              if (!guardAction("saving settings")) return;
              const next = !humanize;
              setHumanize(next);
              saveAiAndHumanize(aiEnabled, next);
            }}
            className={`
              w-12 h-7 rounded-full relative cursor-pointer
              ${humanize ? "bg-primary" : "bg-neutral-dark/20"}
            `}
            style={{ transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 150ms ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <div
              className={`
                absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform
                ${humanize ? "translate-x-6" : "translate-x-1"}
              `}
            />
          </button>
          </ClickSpark>
        </div>
      </Card>
      </FadeIn>
      )}

      {/* Notifications */}
      <FadeIn delay={0.25}>
      <Card>
        <h3 className="text-sm font-semibold text-neutral-dark/70 mb-4 flex items-center gap-2">
          <Bell size={16} />
          Notifications
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-dark/70">
              Push notifications
            </span>
            <ClickSpark sparkColor="#fff" sparkSize={8} sparkRadius={14} className="inline-flex">
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-7 rounded-full relative cursor-pointer ${
                notifications ? "bg-primary" : "bg-neutral-dark/20"
              }`}
              style={{ transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 150ms ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  notifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            </ClickSpark>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-dark/70">Email updates</span>
            <ClickSpark sparkColor="#fff" sparkSize={8} sparkRadius={14} className="inline-flex">
            <button
              onClick={() => setEmailUpdates(!emailUpdates)}
              className={`w-12 h-7 rounded-full relative cursor-pointer ${
                emailUpdates ? "bg-primary" : "bg-neutral-dark/20"
              }`}
              style={{ transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 150ms ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  emailUpdates ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            </ClickSpark>
          </div>
        </div>
      </Card>
      </FadeIn>

      {/* Danger zone */}
      <FadeIn delay={0.3}>
      <Card className="border-error/30">
        <h3 className="text-sm font-semibold text-error mb-4 flex items-center gap-2">
          <AlertTriangle size={16} />
          Danger Zone
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-dark/70">Wipe all data</p>
              <p className="text-xs text-neutral-dark/40">
                Remove all habits, reminders, and stats
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowWipeModal(true)}
            >
              Wipe Data
            </Button>
          </div>
          <div className="h-px bg-error/10" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-dark/70">Delete account</p>
              <p className="text-xs text-neutral-dark/40">
                Permanently delete your account and all data
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Card>
      </FadeIn>

      {/* Wipe confirmation */}
      <Modal
        open={showWipeModal}
        onClose={() => {
          setShowWipeModal(false);
          setDangerInput("");
        }}
        title="Wipe all data?"
      >
        <p className="text-sm text-neutral-dark/60 mb-4">
          This will permanently remove all your habits, reminders, and
          statistics. Type <strong>WIPE</strong> to confirm.
        </p>
        <Input
          value={dangerInput}
          onChange={(e) => setDangerInput(e.target.value)}
          placeholder='Type "WIPE"'
        />
        <div className="flex gap-3 mt-4">
          <Button
            variant="ghost"
            onClick={() => {
              setShowWipeModal(false);
              setDangerInput("");
            }}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={dangerInput !== "WIPE"}
            onClick={wipeData}
            className="flex-1"
          >
            Wipe Everything
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDangerInput("");
        }}
        title="Delete your account?"
      >
        <p className="text-sm text-neutral-dark/60 mb-4">
          This action is irreversible. Type <strong>DELETE</strong> to confirm.
        </p>
        <Input
          value={dangerInput}
          onChange={(e) => setDangerInput(e.target.value)}
          placeholder='Type "DELETE"'
        />
        <div className="flex gap-3 mt-4">
          <Button
            variant="ghost"
            onClick={() => {
              setShowDeleteModal(false);
              setDangerInput("");
            }}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={dangerInput !== "DELETE"}
            onClick={deleteAccount}
            className="flex-1"
          >
            Delete Account
          </Button>
        </div>
      </Modal>
    </div>
  );
}
