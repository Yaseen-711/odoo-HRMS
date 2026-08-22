import React, { useState, useEffect } from "react";
import { CreditCard, Search, DollarSign, Users, Award, Edit3, X, Check, Loader2 } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { employeeRepository } from "../data/employees";
import { InputField } from "../components/InputField";

export const Payroll = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Salary adjustment modal states
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [newSalary, setNewSalary] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPayrollData();
  }, []);

  const loadPayrollData = () => {
    setLoading(true);
    const data = employeeRepository.getAll();
    setEmployees(data);
    setLoading(false);
  };

  const handleOpenAdjustModal = (emp) => {
    setSelectedEmp(emp);
    setNewSalary(emp.salary || 50000);
    setModalOpen(true);
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    try {
      setSaving(true);
      employeeRepository.update(selectedEmp.id, { salary: Number(newSalary) });
      loadPayrollData();
      setModalOpen(false);
      setSelectedEmp(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Calculations
  const totalPayroll = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
  const avgSalary = employees.length > 0 ? Math.round(totalPayroll / employees.length) : 0;
  
  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || 
           emp.employee_id.toLowerCase().includes(query) ||
           emp.department.toLowerCase().includes(query);
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto text-left">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-normal text-ink tracking-tight">
              Payroll & Compensation
            </h1>
            <p className="text-xs md:text-sm text-muted">
              Manage workforce salaries, pay rate structures, and company-wide compensation overview.
            </p>
          </div>
        </div>

        {/* PAYROLL SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total Payroll */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Total Monthly Payroll</span>
              <span className="text-2xl font-semibold text-ink font-mono mt-1">₹{totalPayroll.toLocaleString()}</span>
            </div>
            <div className="p-3 rounded bg-primary/10 border border-primary/20 text-primary">
              <DollarSign size={20} />
            </div>
          </div>

          {/* Card 2: Avg Salary */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Average Salary</span>
              <span className="text-2xl font-semibold text-ink font-mono mt-1">₹{avgSalary.toLocaleString()}</span>
            </div>
            <div className="p-3 rounded bg-blue-500/10 border border-blue-500/20 text-blue-500">
              <Award size={20} />
            </div>
          </div>

          {/* Card 3: Active Contracts */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Active Paid Employees</span>
              <span className="text-2xl font-semibold text-ink font-mono mt-1">{employees.length}</span>
            </div>
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <Users size={20} />
            </div>
          </div>
        </div>

        {/* SEARCH AND DIRECTORY TABLE */}
        <div className="bg-surface-card border border-hairline rounded-lg overflow-hidden flex flex-col">
          
          {/* Search bar wrapper */}
          <div className="p-4 border-b border-hairline flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-3 flex items-center text-muted">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search by name, ID or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-canvas border border-hairline-strong rounded-md py-2 pl-9 pr-4 text-xs text-ink placeholder-muted focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <span className="text-xs text-muted font-medium">
              Showing {filteredEmployees.length} of {employees.length} contracts
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="animate-spin text-primary w-6 h-6" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-20 text-center text-xs text-muted font-medium">
              No payroll profiles matched the query parameters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-canvas border-b border-hairline text-[10px] font-bold uppercase tracking-wider text-muted">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4">Monthly Salary</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-xs font-semibold text-ink">
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-canvas-soft transition-colors">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <img
                          src={emp.profile_picture}
                          alt={`${emp.first_name} ${emp.last_name}`}
                          className="w-8 h-8 rounded object-cover border border-hairline"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-ink leading-tight">{emp.first_name} {emp.last_name}</span>
                          <span className="text-[10px] text-muted mt-0.5">{emp.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted">
                        {emp.employee_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span>{emp.department}</span>
                          <span className="text-[10px] text-muted font-normal mt-0.5">{emp.job_position}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-ink">
                        ₹{(emp.salary || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenAdjustModal(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-strong hover:bg-canvas border border-hairline-strong rounded text-[11px] font-bold text-ink transition-all"
                        >
                          <Edit3 size={11} className="text-primary" /> Adjust Salary
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

      {/* ADJUST SALARY MODAL */}
      {modalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-card border border-hairline-strong max-w-sm w-full rounded-md p-6 text-left flex flex-col gap-4 shadow-sm animate-fade-in">
            
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-semibold text-ink">Adjust Compensation</span>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wide">
                  {selectedEmp.first_name} {selectedEmp.last_name} ({selectedEmp.employee_id})
                </span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded text-muted hover:text-ink hover:bg-canvas-soft border border-hairline"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} className="flex flex-col gap-4">
              <InputField
                label="New Monthly Salary (₹)"
                id="adjust-monthly-salary"
                type="number"
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
                required
              />

              <div className="flex items-center gap-2 pt-2 border-t border-hairline-soft">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded bg-surface-strong border border-hairline hover:bg-canvas-soft text-xs font-semibold text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded bg-primary hover:bg-primary-active text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  {saving ? (
                    <Loader2 className="animate-spin w-3 h-3" />
                  ) : (
                    <>
                      <Check size={13} /> Update Pay
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
