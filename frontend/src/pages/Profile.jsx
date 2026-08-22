import React, { useState, useEffect } from "react";
import { User, Phone, MapPin, Briefcase, Mail, CheckCircle2, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { authService } from "../services/authService";
import { employeeRepository } from "../data/employees";
import { InputField } from "../components/InputField";

export const Profile = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);

  // Form edit states
  const [editMode, setEditMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      
      // Look up corresponding employee details (Admins map to EMP-0001)
      const empId = user.role === "ADMIN" ? "EMP-0001" : user.login_id;
      const details = employeeRepository.getById(empId);
      if (details) {
        setProfileData(details);
        setPhone(details.phone || "");
        setAddress(details.address || "");
      }
    }
  }, []);

  const handleUpdateContact = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (profileData) {
      try {
        const updated = employeeRepository.update(profileData.employee_id, {
          phone,
          address
        });
        setProfileData(updated);
        setSuccess("Contact information updated successfully.");
        setEditMode(false);
      } catch (err) {
        setError(err.message || "Failed to update contact info.");
      }
    }
  };

  if (!profileData) return null;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto text-left">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-normal text-ink tracking-tight">
            My Profile
          </h1>
          <p className="text-xs md:text-sm text-muted">
            Manage your personal data, credentials, and work information.
          </p>
        </div>

        {/* TOP PROFILE CARD */}
        <div className="bg-surface-card border border-hairline rounded-lg p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
            <img
              src={profileData.profile_picture}
              alt="Profile Avatar"
              className="w-24 h-24 rounded-lg object-cover border border-hairline"
            />
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-normal text-ink tracking-tight">
                {profileData.first_name} {profileData.last_name}
              </h2>
              <span className="text-xs font-mono font-semibold text-muted uppercase tracking-wider mt-0.5">
                {profileData.employee_id}
              </span>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3 text-xs text-ink font-semibold">
                <span className="flex items-center gap-1 bg-canvas border border-hairline px-2.5 py-1 rounded">
                  <Briefcase size={12} className="text-primary" /> {profileData.job_position}
                </span>
                <span className="flex items-center gap-1 bg-canvas border border-hairline px-2.5 py-1 rounded">
                  <User size={12} className="text-primary" /> {profileData.department}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 bg-surface-card border border-hairline-strong rounded-md text-[13px] font-semibold text-ink hover:bg-canvas-soft transition-all duration-150"
          >
            {editMode ? "Cancel Editing" : "Edit Contact"}
          </button>
        </div>

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3 text-xs text-emerald-600 flex items-center gap-2">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        {error && (
          <div className="bg-red-500/5 border border-semantic-error/30 rounded-md p-3 text-xs text-semantic-error flex items-center gap-2">
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Work details - READONLY */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col gap-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink border-b border-hairline pb-2.5">
              Employment Details
            </span>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted font-medium">Reporting Manager</span>
                <span className="font-semibold text-ink">{profileData.manager || "Sarah Jenkins"}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted font-medium">Workplace Office</span>
                <span className="font-semibold text-ink">{profileData.location || "San Francisco"}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted font-medium">Date of Joining</span>
                <span className="font-semibold text-ink">{profileData.date_of_joining}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted font-medium">Employee Role</span>
                <span className="font-semibold text-ink uppercase">{currentUser?.role}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted font-medium">Date of Birth</span>
                <span className="font-semibold text-ink">{profileData.date_of_birth || "1990-05-12"}</span>
              </div>
            </div>
          </div>

          {/* Edit Contact details */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col gap-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink border-b border-hairline pb-2.5">
              Contact Information
            </span>

            {!editMode ? (
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-canvas border border-hairline rounded text-muted shrink-0">
                    <Mail size={14} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-muted font-medium">Work Email</span>
                    <span className="font-semibold text-ink truncate">{profileData.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-canvas border border-hairline rounded text-muted shrink-0">
                    <Phone size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted font-medium">Phone Number</span>
                    <span className="font-semibold text-ink">{profileData.phone || "--"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-canvas border border-hairline rounded text-muted shrink-0">
                    <MapPin size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted font-medium">Residential Address</span>
                    <span className="font-semibold text-ink">{profileData.address || "--"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateContact} className="flex flex-col gap-4">
                <InputField
                  label="Phone Number"
                  id="profile_phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 019-2834"
                />

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Residential Address
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 742 Evergreen Terrace..."
                    rows={3}
                    className="w-full rounded-md bg-surface-card border border-hairline-strong px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary placeholder-muted-soft"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-active text-white font-bold py-2.5 rounded-md text-xs transition-all mt-2"
                >
                  Save Contact Updates
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};
