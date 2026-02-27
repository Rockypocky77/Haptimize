"use client";

import { useState, useCallback } from "react";
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
import { Shield, User, Bell, Sparkles, Trash2, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const { user, profile, logout } = useAuth();
  const isEmailAuth = profile?.authProvider === "email";

  const [username, setUsername] = useState(profile?.displayName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [aiEnabled, setAiEnabled] = useState(profile?.aiEnabled ?? true);
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dangerInput, setDangerInput] = useState("");

  const saveProfile = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      await updateProfile(user, { displayName: username });
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        displayName: username,
        aiEnabled,
      });
      setMessage("Settings saved.");
    } catch {
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }, [user, username, aiEnabled]);

  const changePassword = useCallback(async () => {
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
    if (!user) return;
    try {
      const collections = ["habits", "habitLogs", "reminders", "dailyStats"];
      for (const col of collections) {
        try {
          const colRef = collection(db, col, user.uid, "items");
          const snap = await getDocs(colRef);
          for (const d of snap.docs) {
            await deleteDoc(d.ref);
          }
        } catch {
          // Collection may not exist
        }
      }
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
      await logout();
    } catch {
      setMessage(
        "Failed to delete account. You may need to re-authenticate first."
      );
      setShowDeleteModal(false);
    }
  }, [user, logout]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-neutral-dark">Settings</h1>

      {message && (
        <div className="bg-primary/10 text-primary text-sm rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      {/* Profile */}
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

      {/* Password (email auth only) */}
      {isEmailAuth && (
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
      )}

      {!isEmailAuth && (
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
      )}

      {/* AI toggle */}
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
          <button
            onClick={() => setAiEnabled(!aiEnabled)}
            className={`
              w-12 h-7 rounded-full relative cursor-pointer transition-colors
              ${aiEnabled ? "bg-primary" : "bg-neutral-dark/20"}
            `}
          >
            <div
              className={`
                absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform
                ${aiEnabled ? "translate-x-6" : "translate-x-1"}
              `}
            />
          </button>
        </div>
      </Card>

      {/* Notifications */}
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
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors ${
                notifications ? "bg-primary" : "bg-neutral-dark/20"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  notifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-dark/70">Email updates</span>
            <button
              onClick={() => setEmailUpdates(!emailUpdates)}
              className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors ${
                emailUpdates ? "bg-primary" : "bg-neutral-dark/20"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  emailUpdates ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Danger zone */}
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
