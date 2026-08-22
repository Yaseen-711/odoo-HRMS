import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Shield, Bell, Key, CheckCircle2, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { authService } from "../services/authService";
import { PasswordField } from "../components/PasswordField";

export const Settings = () => {
  const [currentUser, setCurrentUser] = useState(null);

  // Preference states (simulated / persisted)
  const [preferences, setPreferences] = useState({
    mfa_enabled: false,
    sound_notifications: true,
    email_digests: false,
    session_timeout: "30"
  });

  // Password fields
  const [pwdForm, setPwdForm] = useState({ current: "", new: "", confirm: "" });
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }

    // Load persisted preferences
    const storedPrefs = localStorage.getItem("dayflow_preferences");
    if (storedPrefs) {
      try {
        setPreferences(JSON.parse(storedPrefs));
      } catch (e) {}
    }
  }, []);

  const handleTogglePreference = (key) => {
    const updated = {
      ...preferences,
      [key]: !preferences[key]
    };
    setPreferences(updated);
    localStorage.setItem("dayflow_preferences", JSON.stringify(updated));
  };

  const handleSelectTimeout = (e) => {
    const updated = {
      ...preferences,
      session_timeout: e.target.value
    };
    setPreferences(updated);
    localStorage.setItem("dayflow_preferences", JSON.stringify(updated));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!pwdForm.current || !pwdForm.new || !pwdForm.confirm) {
      setPwdError("All password fields are required.");
      return;
    }

    if (pwdForm.new !== pwdForm.confirm) {
      setPwdError("New passwords do not match.");
      return;
    }

    if (pwdForm.new.length < 6) {
      setPwdError("Password must be at least 6 characters.");
      return;
    }

    try {
      await authService.changePassword(pwdForm.current, pwdForm.new);
      setPwdSuccess("Your workspace password has been updated.");
      setPwdForm({ current: "", new: "", confirm: "" });
    } catch (err) {
      setPwdError(err.message || "Failed to update password.");
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto text-left">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-normal text-ink tracking-tight">
            Settings & Security
          </h1>
          <p className="text-xs md:text-sm text-muted">
            Configure system configurations, security standards, and passwords.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Security & Alerts Preferences */}
          <div className="flex flex-col gap-6">
            
            {/* Preferences Card */}
            <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col gap-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink border-b border-hairline pb-2.5 flex items-center gap-1.5">
                <Bell size={14} className="text-primary" /> Workspace Alert Preferences
              </span>

              <div className="flex flex-col gap-4 text-xs font-semibold text-ink">
                
                {/* Preference item 1 */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex flex-col gap-0.5">
                    <span>MFA Authentication</span>
                    <span className="text-[10px] text-muted font-normal">Require security code during login</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.mfa_enabled}
                    onChange={() => handleTogglePreference("mfa_enabled")}
                    className="rounded bg-canvas border-hairline-strong text-primary focus:ring-0 h-4 w-4"
                  />
                </label>

                {/* Preference item 2 */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex flex-col gap-0.5">
                    <span>Sound Alerts</span>
                    <span className="text-[10px] text-muted font-normal">Play notification sound effects</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.sound_notifications}
                    onChange={() => handleTogglePreference("sound_notifications")}
                    className="rounded bg-canvas border-hairline-strong text-primary focus:ring-0 h-4 w-4"
                  />
                </label>

                {/* Preference item 3 */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex flex-col gap-0.5">
                    <span>Weekly Digests</span>
                    <span className="text-[10px] text-muted font-normal">Send department reports to email</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.email_digests}
                    onChange={() => handleTogglePreference("email_digests")}
                    className="rounded bg-canvas border-hairline-strong text-primary focus:ring-0 h-4 w-4"
                  />
                </label>

                {/* Preference select dropdown */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-hairline-soft">
                  <div className="flex flex-col gap-0.5">
                    <span>Idle Session Timeout</span>
                    <span className="text-[10px] text-muted font-normal">Lock screen after inactivity duration</span>
                  </div>
                  <select
                    value={preferences.session_timeout}
                    onChange={handleSelectTimeout}
                    className="rounded border border-hairline-strong bg-surface-card py-1 px-2.5 text-xs text-ink focus:outline-none focus:border-primary"
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">60 Minutes</option>
                    <option value="120">2 Hours</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Platform Information Card */}
            <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink border-b border-hairline pb-2 flex items-center gap-1.5">
                <Shield size={14} className="text-primary" /> Compliance & Integrity
              </span>
              <div className="text-xs text-muted leading-relaxed flex flex-col gap-2">
                <p>
                  Dayflow Workspace meets active NIST standards for user identity protection and password entropy limits.
                </p>
                <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] font-semibold text-ink">
                  <span>Version: 1.0.4-beta</span>
                  <span>•</span>
                  <span>Environment: Mock-Sandboxed</span>
                </div>
              </div>
            </div>

          </div>

          {/* Change Password Card */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col gap-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink border-b border-hairline pb-2.5 flex items-center gap-1.5">
              <Key size={14} className="text-primary" /> Update Password Credentials
            </span>

            {pwdSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3 text-xs text-emerald-600 flex items-center gap-2">
                <CheckCircle2 size={16} /> {pwdSuccess}
              </div>
            )}

            {pwdError && (
              <div className="bg-red-500/5 border border-semantic-error/30 rounded-md p-3 text-xs text-semantic-error flex items-center gap-2">
                <ShieldAlert size={16} /> {pwdError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <PasswordField
                label="Current Password"
                id="settings-curr-pwd"
                placeholder="••••••••"
                value={pwdForm.current}
                onChange={(e) => setPwdForm(prev => ({ ...prev, current: e.target.value }))}
                required
              />

              <PasswordField
                label="New Password"
                id="settings-new-pwd"
                placeholder="••••••••"
                value={pwdForm.new}
                onChange={(e) => setPwdForm(prev => ({ ...prev, new: e.target.value }))}
                required
              />

              <PasswordField
                label="Confirm New Password"
                id="settings-conf-pwd"
                placeholder="••••••••"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm(prev => ({ ...prev, confirm: e.target.value }))}
                required
              />

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-active text-white font-bold py-2.5 rounded-md text-xs transition-all mt-2"
              >
                Change Workspace Password
              </button>
            </form>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};
