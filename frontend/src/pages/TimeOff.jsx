import React, { useState, useEffect } from "react";
import { Calendar, Plus, X, Check, HelpCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { authService } from "../services/authService";
import { employeeRepository } from "../data/employees";
import { leaveRepository } from "../data/leave";
import { notificationRepository } from "../data/notifications";
import { InputField } from "../components/InputField";

export const TimeOff = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);

  // Leave data
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState({ PAID: 0, SICK: 0, UNPAID: 0 });

  // Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "PAID",
    start_date: "",
    end_date: "",
    remarks: ""
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setEmployees(employeeRepository.getAll());
      loadLeaveData(user);
    }
  }, []);

  const loadLeaveData = (user) => {
    let list = [];
    if (user.role === "ADMIN") {
      list = leaveRepository.getAll();
    } else {
      list = leaveRepository.getByEmployee(user.login_id);
    }
    setRequests(list);

    const empId = user.role === "ADMIN" ? "EMP-0001" : user.login_id;
    setBalances(leaveRepository.getBalances(empId));
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!leaveForm.start_date || !leaveForm.end_date) {
      setFormError("Start date and End date are required.");
      return;
    }

    const start = new Date(leaveForm.start_date);
    const end = new Date(leaveForm.end_date);
    if (end < start) {
      setFormError("End date must be on or after start date.");
      return;
    }

    if (!currentUser) return;
    const empId = currentUser.role === "ADMIN" ? "EMP-0001" : currentUser.login_id;
    
    leaveRepository.submit(empId, leaveForm);

    notificationRepository.add(
      "Leave Requested",
      `${currentUser.name} requested leave: ${leaveForm.leave_type} (${leaveForm.start_date} to ${leaveForm.end_date})`,
      "leave"
    );

    // Close and reload
    setShowRequestModal(false);
    loadLeaveData(currentUser);
  };

  const handleDecideLeave = (id, status) => {
    leaveRepository.decide(id, status);
    
    // Add notification
    const request = leaveRepository.getAll().find(l => l.id === Number(id));
    const requester = employees.find(e => e.employee_id === request?.employee_id);
    const requesterName = requester ? `${requester.first_name} ${requester.last_name}` : "Employee";
    
    notificationRepository.add(
      `Leave Request ${status}`,
      `Leave request from ${requesterName} has been ${status.toLowerCase()}.`,
      "leave"
    );

    if (currentUser) {
      loadLeaveData(currentUser);
    }
  };

  // Computes summary counts
  const pendingCount = requests.filter(r => r.status === "PENDING").length;
  const approvedCount = requests.filter(r => r.status === "APPROVED").length;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto text-left">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-normal text-ink tracking-tight">
              Time Off & Leaves
            </h1>
            <p className="text-xs md:text-sm text-muted">
              Submit leave applications or check approved absence records.
            </p>
          </div>

          <button
            onClick={() => {
              setFormError("");
              setLeaveForm({
                leave_type: "PAID",
                start_date: "",
                end_date: "",
                remarks: ""
              });
              setShowRequestModal(true);
            }}
            className="px-4 py-2 bg-primary hover:bg-primary-active text-white rounded-md text-[13px] font-semibold transition-all duration-150 flex items-center gap-1.5 shadow-xs self-start md:self-auto"
          >
            <Plus size={14} /> Request Time Off
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="bg-surface-card border border-hairline rounded-lg p-5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Leave Balance</span>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-semibold text-ink">{balances.PAID}</span>
              <span className="text-xs text-muted">PAID days remaining</span>
            </div>
          </div>
          {/* Card 2 */}
          <div className="bg-surface-card border border-hairline rounded-lg p-5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Pending Approvals</span>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-semibold text-ink">{pendingCount}</span>
              <span className="text-xs text-muted">requests waiting action</span>
            </div>
          </div>
          {/* Card 3 */}
          <div className="bg-surface-card border border-hairline rounded-lg p-5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Approved Absences</span>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-semibold text-ink">{approvedCount}</span>
              <span className="text-xs text-muted">scheduled leave periods</span>
            </div>
          </div>
        </div>

        {/* LEAVE APPLICATIONS TABLE */}
        <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col gap-4">
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink border-b border-hairline pb-4">
            {currentUser?.role === "ADMIN" ? "Company Leave Directory" : "Your Absence Logs"}
          </span>

          {requests.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted">
              No leave requests registered.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-hairline text-muted font-bold uppercase tracking-wider">
                    {currentUser?.role === "ADMIN" && <th className="py-3 px-4">Employee</th>}
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">End Date</th>
                    <th className="py-3 px-4">Reason / Remarks</th>
                    <th className="py-3 px-4">Status</th>
                    {currentUser?.role === "ADMIN" && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const emp = employees.find(e => e.employee_id === req.employee_id);
                    return (
                      <tr key={req.id} className="border-b border-hairline-soft hover:bg-canvas-soft/30 transition-colors">
                        {currentUser?.role === "ADMIN" && (
                          <td className="py-3 px-4 font-semibold text-ink">
                            <div className="flex items-center gap-2">
                              {emp && (
                                <img
                                  src={emp.profile_picture}
                                  alt="Avatar"
                                  className="w-6 h-6 rounded-md object-cover border border-hairline"
                                />
                              )}
                              <div className="flex flex-col">
                                <span>{emp ? `${emp.first_name} ${emp.last_name}` : "Unknown"}</span>
                                <span className="text-[10px] text-muted font-mono">{req.employee_id}</span>
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="py-3 px-4 font-semibold text-ink">{req.leave_type}</td>
                        <td className="py-3 px-4 font-mono text-body">{req.start_date}</td>
                        <td className="py-3 px-4 font-mono text-body">{req.end_date}</td>
                        <td className="py-3 px-4 text-muted truncate max-w-xs">{req.remarks || "--"}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            req.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : req.status === "PENDING"
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-red-50 text-red-500 border-red-100"
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        {currentUser?.role === "ADMIN" && (
                          <td className="py-3 px-4 text-right">
                            {req.status === "PENDING" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleDecideLeave(req.id, "APPROVED")}
                                  className="p-1 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100"
                                  title="Approve Request"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  onClick={() => handleDecideLeave(req.id, "REJECTED")}
                                  className="p-1 rounded bg-red-50 border border-red-100 text-red-500 hover:bg-red-100"
                                  title="Reject Request"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted font-semibold italic">Processed</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

      {/* REQUEST LEAVE DIALOG MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-card border border-hairline-strong max-w-sm w-full rounded-md p-6 text-left flex flex-col gap-4 shadow-sm animate-fade-in">
            
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <span className="text-base font-semibold text-ink">Submit Leave Application</span>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-1 rounded hover:bg-canvas-soft border border-hairline text-muted hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="bg-red-500/5 border border-semantic-error/30 rounded-md p-2.5 text-xs text-semantic-error">
                {formError}
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Leave Category
                </label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, leave_type: e.target.value }))}
                  className="w-full rounded-md bg-surface-card border border-hairline-strong px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary"
                >
                  <option value="PAID">PAID - Personal Annual Leave</option>
                  <option value="SICK">SICK - Medical Health Absence</option>
                  <option value="UNPAID">UNPAID - Leave Without Salary Deduction</option>
                </select>
              </div>

              <InputField
                label="Start Date"
                id="leave_start"
                type="date"
                value={leaveForm.start_date}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />

              <InputField
                label="End Date"
                id="leave_end"
                type="date"
                value={leaveForm.end_date}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, end_date: e.target.value }))}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Remarks / Reason
                </label>
                <textarea
                  placeholder="Provide details about your absence requests..."
                  value={leaveForm.remarks}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md bg-surface-card border border-hairline-strong px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary placeholder-muted-soft"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-active text-white font-bold py-2.5 rounded-md text-xs transition-all mt-2"
              >
                Submit Application
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
