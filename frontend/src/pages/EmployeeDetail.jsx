import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, Calendar, Shield, User, Clock } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { employeeService } from "../services/employeeService";
import { leaveRepository } from "../data/leave";

export const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState({ PAID: 15, SICK: 8, UNPAID: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setError(null);
        const record = await employeeService.getById(id);
        if (record) {
          setEmployee(record);
          // Fetch leave balances for this employee using frontend-only data
          const balances = leaveRepository.getBalances(record.employee_id);
          setLeaveBalances(balances);
        } else {
          setEmployee(null);
        }
      } catch (err) {
        console.error("Failed to load employee:", err);
        setError("An error occurred while fetching employee details.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmployee();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-sm font-medium text-muted">Loading employee details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !employee) {
    return (
      <DashboardLayout>
        <div className="bg-surface-card border border-hairline rounded-lg p-16 text-center max-w-xl mx-auto flex flex-col items-center justify-center gap-4">
          <span className="text-sm font-semibold text-ink">Employee Profile Not Found</span>
          <p className="text-xs text-muted">{error || "The employee identifier could not be verified in the directory."}</p>
          <Link
            to="/employees"
            className="px-4 py-2 bg-surface-strong hover:bg-hairline-strong text-ink text-xs font-bold rounded-md transition-all"
          >
            Return to Directory
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto text-left">
        
        {/* BACK BUTTON */}
        <div>
          <Link
            to="/employees"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors duration-150"
          >
            <ArrowLeft size={14} /> Back to Directory
          </Link>
        </div>

        {/* PROFILE HEADER CARD */}
        <div className="bg-surface-card border border-hairline rounded-lg p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative">
          
          {/* Status Indicator Absolute */}
          <div className="absolute top-6 right-6 flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${
              employee.status === "Present"
                ? "bg-emerald-500"
                : employee.status === "On Leave"
                ? "bg-blue-500"
                : "bg-amber-500"
            }`}></span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{employee.status}</span>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
            <img
              src={employee.profile_picture}
              alt={`${employee.first_name} ${employee.last_name}`}
              className="w-24 h-24 rounded-lg object-cover border border-hairline"
            />
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-normal text-ink tracking-tight">
                {employee.first_name} {employee.last_name}
              </h2>
              <span className="text-xs font-mono font-semibold text-muted uppercase tracking-wider mt-0.5">
                {employee.employee_id}
              </span>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3 text-xs text-ink font-semibold">
                <span className="flex items-center gap-1 bg-canvas border border-hairline px-2.5 py-1 rounded">
                  <Briefcase size={12} className="text-primary" /> {employee.job_position}
                </span>
                <span className="flex items-center gap-1 bg-canvas border border-hairline px-2.5 py-1 rounded">
                  <User size={12} className="text-primary" /> {employee.department}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CORE INFORMATION GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* General and Job Info */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col gap-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink border-b border-hairline pb-2.5">
              Employment Details
            </span>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted font-medium">Company Name</span>
                <span className="font-semibold text-ink">{employee.company || "Dayflow Inc."}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted font-medium">Office Location</span>
                <span className="font-semibold text-ink">{employee.location || "San Francisco"}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted font-medium">Date of Joining</span>
                <span className="font-semibold text-ink">{employee.date_of_joining}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted font-medium">Reports To</span>
                <span className="font-semibold text-ink">{employee.manager || "Sarah Jenkins"}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted font-medium">Date of Birth</span>
                <span className="font-semibold text-ink">{employee.date_of_birth || "1990-05-12"}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted font-medium">Monthly Salary</span>
                <span className="font-semibold text-ink">
                  {employee.salary ? `₹${employee.salary.toLocaleString()}` : "Not Configured"}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="bg-surface-card border border-hairline rounded-lg p-6 flex flex-col gap-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink border-b border-hairline pb-2.5">
              Contact Information
            </span>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-canvas border border-hairline rounded text-muted shrink-0">
                  <Mail size={14} />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-muted font-medium">Work Email</span>
                  <span className="font-semibold text-ink truncate">{employee.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-canvas border border-hairline rounded text-muted shrink-0">
                  <Phone size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-muted font-medium">Phone Number</span>
                  <span className="font-semibold text-ink">{employee.phone || "+1 (555) 019-2834"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-canvas border border-hairline rounded text-muted shrink-0">
                  <MapPin size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-muted font-medium">Residential Address</span>
                  <span className="font-semibold text-ink">{employee.address || "742 Evergreen Terrace, Springfield"}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* TIME OFF & BALANCES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-surface-card border border-hairline rounded-lg p-5 text-left">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Paid leaves available</span>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-3xl font-semibold text-ink">{leaveBalances.PAID}</span>
              <span className="text-xs text-muted">days</span>
            </div>
            <div className="w-full bg-canvas-soft h-1 rounded-full mt-3.5 overflow-hidden">
              <div className="bg-primary h-full w-[70%] rounded-full"></div>
            </div>
          </div>

          <div className="bg-surface-card border border-hairline rounded-lg p-5 text-left">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Sick leaves available</span>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-3xl font-semibold text-ink">{leaveBalances.SICK}</span>
              <span className="text-xs text-muted">days</span>
            </div>
            <div className="w-full bg-canvas-soft h-1 rounded-full mt-3.5 overflow-hidden">
              <div className="bg-blue-500 h-full w-[45%] rounded-full"></div>
            </div>
          </div>

          <div className="bg-surface-card border border-hairline rounded-lg p-5 text-left">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Unpaid leaves taken</span>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-3xl font-semibold text-ink">{15 - leaveBalances.UNPAID}</span>
              <span className="text-xs text-muted">days</span>
            </div>
            <div className="w-full bg-canvas-soft h-1 rounded-full mt-3.5 overflow-hidden">
              <div className="bg-amber-500 h-full w-[33%] rounded-full"></div>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};
