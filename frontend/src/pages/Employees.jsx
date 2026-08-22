import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Mail, Phone, ChevronRight, X, Sparkles, CheckCircle2, Copy, Check } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { authService } from "../services/authService";
import { employeeRepository } from "../data/employees";
import { InputField } from "../components/InputField";

export const Employees = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // Lists
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");

  // Onboarding Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    department: "Engineering",
    job_position: "",
    location: "San Francisco",
    manager: ""
  });
  const [onboardError, setOnboardError] = useState("");
  const [onboardResult, setOnboardResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setCurrentUser(user);
    setEmployees(employeeRepository.getAll());
  }, [navigate]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleOnboardSubmit = (e) => {
    e.preventDefault();
    setOnboardError("");
    
    if (!onboardForm.first_name || !onboardForm.last_name || !onboardForm.email) {
      setOnboardError("First Name, Last Name, and Work Email are required fields.");
      return;
    }

    try {
      const result = employeeRepository.create(onboardForm);
      setOnboardResult(result);
      
      // Refresh list
      setEmployees(employeeRepository.getAll());
    } catch (err) {
      setOnboardError(err.message || "Failed to onboard new employee.");
    }
  };

  const handleCopyCredentials = () => {
    if (onboardResult) {
      const text = `Login ID: ${onboardResult.loginId}\nTemp Password: ${onboardResult.temporaryPassword}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const departments = ["All", "Engineering", "Design", "Product", "QA", "HR & Admin"];

  // Filter logic
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.job_position.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesDept = selectedDept === "All" || emp.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  return (
    <DashboardLayout onSearch={handleSearch}>
      <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col text-left">
            <h1 className="text-2xl md:text-3xl font-normal text-ink tracking-tight">
              Employee Directory
            </h1>
            <p className="text-xs md:text-sm text-muted">
              Search and manage your workforce accounts and statuses.
            </p>
          </div>

          {currentUser?.role === "ADMIN" && (
            <button
              onClick={() => {
                setOnboardResult(null);
                setOnboardError("");
                setOnboardForm({
                  first_name: "",
                  last_name: "",
                  email: "",
                  phone: "",
                  address: "",
                  department: "Engineering",
                  job_position: "",
                  location: "San Francisco",
                  manager: ""
                });
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-primary hover:bg-primary-active text-white rounded-md text-[13px] font-semibold transition-all duration-150 flex items-center gap-1.5 shadow-xs self-start md:self-auto"
            >
              <Plus size={14} /> Onboard Employee
            </button>
          )}
        </div>

        {/* FILTERS & SEARCH ROW */}
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline pb-4 text-left">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider mr-2 flex items-center gap-1">
            <Filter size={11} /> Filter department
          </span>
          <div className="flex flex-wrap gap-1.5">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all duration-150 ${
                  selectedDept === dept
                    ? "bg-ink text-white border-ink"
                    : "bg-surface-card text-body border-hairline-strong hover:bg-canvas-soft"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* DIRECTORY GRID */}
        {filteredEmployees.length === 0 ? (
          <div className="bg-surface-card border border-hairline rounded-lg p-16 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-semibold text-ink">No employees found</span>
            <p className="text-xs text-muted mt-1">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => navigate(`/employees/${emp.employee_id}`)}
                className="bg-surface-card border border-hairline hover:border-hairline-strong rounded-lg p-5 flex flex-col justify-between text-left cursor-pointer transition-all duration-150 relative group"
              >
                {/* Employee Status Pill absolute top */}
                <div className="absolute top-5 right-5 flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    emp.status === "Present"
                      ? "bg-emerald-500"
                      : emp.status === "On Leave"
                      ? "bg-blue-500"
                      : "bg-amber-500"
                  }`}></span>
                  <span className="text-[10px] font-semibold text-muted tracking-wide">{emp.status}</span>
                </div>

                <div className="flex items-start gap-4">
                  <img
                    src={emp.profile_picture}
                    alt={`${emp.first_name} ${emp.last_name}`}
                    className="w-14 h-14 rounded-md object-cover border border-hairline"
                  />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-base font-semibold text-ink group-hover:text-primary transition-colors truncate">
                      {emp.first_name} {emp.last_name}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-muted uppercase tracking-wider mt-0.5">
                      {emp.employee_id}
                    </span>
                    <span className="text-xs text-ink font-semibold mt-1">
                      {emp.job_position} • <span className="text-muted font-normal">{emp.department}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-hairline-soft flex flex-col gap-1.5 text-xs text-muted">
                  <div className="flex items-center gap-2 truncate">
                    <Mail size={12} className="text-muted-soft" />
                    <span>{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-muted-soft" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2 flex items-center justify-end text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform duration-150">
                  View Profile <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ONBOARD EMPLOYEE DIALOG MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-card border border-hairline-strong max-w-lg w-full rounded-md p-6 text-left flex flex-col gap-4 shadow-sm my-8 relative max-h-[90vh] overflow-y-auto animate-fade-in">
            
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <span className="text-lg font-semibold text-ink">Onboard New Employee</span>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-canvas-soft border border-hairline text-muted hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            {onboardError && (
              <div className="bg-red-500/5 border border-semantic-error/30 rounded-md p-2.5 text-xs text-semantic-error">
                {onboardError}
              </div>
            )}

            {!onboardResult ? (
              <form onSubmit={handleOnboardSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="First Name"
                    id="onboard_first_name"
                    placeholder="e.g. John"
                    value={onboardForm.first_name}
                    onChange={(e) => setOnboardForm(prev => ({ ...prev, first_name: e.target.value }))}
                    required
                  />
                  <InputField
                    label="Last Name"
                    id="onboard_last_name"
                    placeholder="e.g. Doe"
                    value={onboardForm.last_name}
                    onChange={(e) => setOnboardForm(prev => ({ ...prev, last_name: e.target.value }))}
                    required
                  />
                </div>

                <InputField
                  label="Work Email Address"
                  id="onboard_email"
                  placeholder="e.g. john.doe@dayflow.com"
                  type="email"
                  value={onboardForm.email}
                  onChange={(e) => setOnboardForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Phone Number"
                    id="onboard_phone"
                    placeholder="e.g. +1 (555) 012-3456"
                    value={onboardForm.phone}
                    onChange={(e) => setOnboardForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <InputField
                    label="Office Location"
                    id="onboard_location"
                    placeholder="e.g. San Francisco"
                    value={onboardForm.location}
                    onChange={(e) => setOnboardForm(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                      Department
                    </label>
                    <select
                      value={onboardForm.department}
                      onChange={(e) => setOnboardForm(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full rounded-md bg-surface-card border border-hairline-strong px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Product">Product</option>
                      <option value="QA">QA</option>
                      <option value="HR & Admin">HR & Admin</option>
                    </select>
                  </div>

                  <InputField
                    label="Job Position"
                    id="onboard_position"
                    placeholder="e.g. Senior Frontend Engineer"
                    value={onboardForm.job_position}
                    onChange={(e) => setOnboardForm(prev => ({ ...prev, job_position: e.target.value }))}
                  />
                </div>

                <InputField
                  label="Reports To (Manager)"
                  id="onboard_manager"
                  placeholder="e.g. Marcus Vance"
                  value={onboardForm.manager}
                  onChange={(e) => setOnboardForm(prev => ({ ...prev, manager: e.target.value }))}
                />

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-active text-white font-bold py-2.5 rounded-md text-xs transition-all mt-2"
                >
                  Onboard Employee & Generate ID
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4 py-4 text-center animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                
                <div className="flex flex-col gap-1">
                  <h4 className="text-base font-bold text-ink">Employee Onboarded!</h4>
                  <p className="text-xs text-muted leading-relaxed">
                    Employee record created. Secure credentials generated. Please communicate these to the employee:
                  </p>
                </div>

                <div className="bg-canvas border border-hairline rounded-md p-4 flex flex-col gap-2.5 text-left text-sm font-mono relative">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">Temporary Login ID</span>
                    <span className="text-ink font-bold font-mono tracking-wider">{onboardResult.loginId}</span>
                  </div>
                  <div className="border-t border-hairline-soft pt-2">
                    <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">Temporary Password</span>
                    <span className="text-ink font-bold font-mono tracking-wider">{onboardResult.temporaryPassword}</span>
                  </div>

                  <button
                    onClick={handleCopyCredentials}
                    className="absolute top-4 right-4 p-1.5 rounded hover:bg-canvas-soft border border-hairline-strong text-muted hover:text-ink transition-all"
                    title="Copy Credentials"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>

                <p className="text-[10px] text-muted italic max-w-xs mx-auto">
                  The employee will be forced to change this password on their first login attempt to secure their account.
                </p>

                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-full bg-ink hover:bg-black text-white py-2 rounded-md text-xs font-bold transition-all shadow-xs"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
