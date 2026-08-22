import React, { useState, useEffect } from "react";
import { User, Phone, MapPin, Briefcase, Mail, CheckCircle2, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { authService } from "../services/authService";
import { employeeService } from "../services/employeeService";
import { documentService } from "../services/documentService";
import { InputField } from "../components/InputField";

export const Profile = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form edit states
  const [editMode, setEditMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const user = authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          const details = await employeeService.getMyProfile();
          if (details) {
            setProfileData(details);
            setPhone(details.phone || "");
            setAddress(details.address || "");
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (profileData) {
      try {
        const updated = await employeeService.updateMyProfile({
          phone,
          address
        });
        
        // Refresh profile data
        const details = await employeeService.getMyProfile();
        setProfileData(details);
        setPhone(details.phone || "");
        setAddress(details.address || "");
        
        setSuccess("Contact information updated successfully.");
        setEditMode(false);
      } catch (err) {
        setError(err.message || "Failed to update contact info.");
      }
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted text-sm">Loading profile data...</p>
        </div>
      </DashboardLayout>
    );
  }

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
              src={profileData.profile_picture || "https://ui-avatars.com/api/?name=" + profileData.first_name + "+" + profileData.last_name}
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
              <div className="flex flex-col gap-0.5">
                <span className="text-muted font-medium">Monthly Salary</span>
                <span className="font-semibold text-ink">
                  {profileData.salary ? `₹${profileData.salary.toLocaleString()}` : "₹50,000"}
                </span>
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

        {/* DOCUMENTS MANAGEMENT CARD */}
        <div className="bg-surface-card border border-hairline rounded-lg p-6 text-left flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink">
                My Attached Documents
              </span>
              <span className="text-xs text-muted">Upload and manage your contracts, ID copies, and certificates.</span>
            </div>
          </div>

          <ProfileDocumentsManager employeeId={profileData.id} />
        </div>

      </div>
    </DashboardLayout>
  );
};

// Sub-component for documents handling
const ProfileDocumentsManager = ({ employeeId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("ID_PROOF");
  const [selectedFile, setSelectedFile] = useState(null);
  const [docError, setDocError] = useState("");
  const [docSuccess, setDocSuccess] = useState("");

  const loadDocuments = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const docs = await documentService.getByEmployee(employeeId);
      setDocuments(docs || []);
    } catch (err) {
      console.warn("Could not load backend documents:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [employeeId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setDocError("Please select a file to upload.");
      return;
    }
    setDocError("");
    setDocSuccess("");
    setUploading(true);

    try {
      await documentService.upload(employeeId, selectedFile, docType);
      setDocSuccess("Document uploaded successfully!");
      setSelectedFile(null);
      await loadDocuments();
    } catch (err) {
      setDocError(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (docId, fileName) => {
    try {
      await documentService.download(docId, fileName);
    } catch (err) {
      alert("Failed to download document.");
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await documentService.delete(docId);
      await loadDocuments();
    } catch (err) {
      alert("Failed to delete document.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Upload Form */}
      <form onSubmit={handleUpload} className="bg-canvas border border-hairline rounded-md p-4 flex flex-col md:flex-row items-center gap-3">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="rounded bg-surface-card border border-hairline px-3 py-2 text-xs font-semibold text-ink"
        >
          <option value="ID_PROOF">ID Proof</option>
          <option value="CONTRACT">Contract</option>
          <option value="CERTIFICATE">Certificate</option>
          <option value="OTHER">Other Document</option>
        </select>

        <input
          type="file"
          id="profile_doc_file"
          onChange={(e) => setSelectedFile(e.target.files[0] || null)}
          className="text-xs text-body file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-surface-card file:text-ink hover:file:bg-canvas-soft flex-1"
        />

        <button
          type="submit"
          disabled={uploading || !selectedFile}
          className="bg-primary hover:bg-primary-active text-white px-4 py-2 rounded text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
      </form>

      {docError && <div className="text-xs text-semantic-error font-medium">{docError}</div>}
      {docSuccess && <div className="text-xs text-emerald-600 font-medium">{docSuccess}</div>}

      {/* Document List */}
      {loading ? (
        <div className="text-xs text-muted">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-xs text-muted italic bg-canvas p-6 rounded text-center border border-hairline">
          No documents attached yet. Use the uploader above to attach files.
        </div>
      ) : (
        <div className="border border-hairline rounded-md overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas border-b border-hairline text-muted uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Document Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Size</th>
                <th className="p-3">Uploaded Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {documents.map((d) => (
                <tr key={d.id} className="hover:bg-canvas-soft">
                  <td className="p-3 font-semibold text-ink">{d.document_name}</td>
                  <td className="p-3"><span className="bg-canvas border border-hairline px-2 py-0.5 rounded text-[10px] font-bold">{d.document_type}</span></td>
                  <td className="p-3 text-muted">{Math.round(d.file_size / 1024)} KB</td>
                  <td className="p-3 text-muted">{new Date(d.uploaded_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleDownload(d.id, d.document_name)}
                      className="text-primary hover:underline font-semibold"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="text-semantic-error hover:underline font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
