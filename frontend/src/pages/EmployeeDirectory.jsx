import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Mail, Phone, ChevronRight, Loader2 } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { authService } from "../services/authService";
import { employeeService } from "../services/employeeService";

export const EmployeeDirectory = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // Lists
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");

  const fetchEmployees = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await employeeService.getAll();
      setEmployees(data);
    } catch (err) {
      setError(err.message || "Failed to load employee directory.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setCurrentUser(user);
    fetchEmployees();
  }, [navigate]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const departments = ["All", "Engineering", "Design", "Product", "QA", "HR & Admin"];

  // Filter logic
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.employee_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.job_position || "").toLowerCase().includes(searchTerm.toLowerCase());
      
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
              Search and view coworker profiles and contact details.
            </p>
          </div>
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
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin rounded-full h-8 w-8 text-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-500/5 border border-semantic-error/30 rounded-lg p-8 text-center text-semantic-error text-xs font-semibold">
            {error}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-surface-card border border-hairline rounded-lg p-16 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-semibold text-ink">No coworkers found</span>
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
                      : emp.status
                      ? "bg-amber-500"
                      : "bg-gray-300"
                  }`}></span>
                  <span className="text-[10px] font-semibold text-muted tracking-wide">{emp.status || "Unknown"}</span>
                </div>

                <div className="flex items-start gap-4">
                  <img
                    src={emp.profile_picture || "https://ui-avatars.com/api/?name=" + encodeURIComponent(emp.first_name + " " + emp.last_name)}
                    alt={`${emp.first_name} ${emp.last_name}`}
                    className="w-14 h-14 rounded-md object-cover border border-hairline bg-canvas-soft"
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
                  View Coworker Profile <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};
