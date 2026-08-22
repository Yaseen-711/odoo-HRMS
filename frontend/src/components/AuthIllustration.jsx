import React from "react";
import { Users, Calendar, CreditCard, Clock, Activity, ArrowRight } from "lucide-react";

export const AuthIllustration = () => {
  return (
    <div className="relative hidden lg:flex lg:w-[58%] bg-canvas-soft overflow-hidden flex-col justify-between p-12 select-none border-r border-hairline-strong">
      
      {/* Top Branding Info */}
      <div className="relative z-10 w-full">
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-primary rounded-md w-7 h-7 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
            d
          </div>
          <span className="font-bold tracking-tight text-ink text-base">Dayflow</span>
          <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-primary">HRMS</span>
        </div>

        <div className="max-w-md mt-12">
          <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-primary block mb-3">
            Dayflow Enterprise Platform
          </span>
          <h1 className="text-3xl xl:text-4xl font-normal text-ink leading-[1.2] tracking-tight mb-4 font-sans">
            Transformative workspace for your entire workforce.
          </h1>
          <p className="text-body text-sm font-medium max-w-sm mb-6">
            Manage attendance, leave schedules, and secure payroll processes in a single unified platform.
          </p>
        </div>
      </div>

      {/* Abstract geometric shapes or lines */}
      <div className="absolute right-[-100px] top-[10%] w-[400px] h-[400px] border border-hairline rounded-full pointer-events-none flex items-center justify-center">
        <div className="w-[280px] h-[280px] border border-hairline-strong rounded-full flex items-center justify-center border-dashed">
          <div className="w-[160px] h-[160px] border border-primary/20 rounded-full flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white border border-hairline flex items-center justify-center shadow-xs transform hover:scale-105 transition-transform duration-300 cursor-pointer">
              <ArrowRight size={16} className="text-ink" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Mockup Area (Dashboard Mockup inside Browser Window) */}
      <div className="relative z-10 mt-auto w-full max-w-xl translate-y-6 transform hover:translate-y-2 transition-transform duration-500 ease-out">
        {/* Browser Frame */}
        <div className="w-full bg-surface-card rounded-t-xl border border-hairline-strong shadow-sm overflow-hidden">
          {/* Browser Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-canvas border-b border-hairline">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
            </div>
            <div className="bg-surface-card border border-hairline text-[10px] text-muted px-6 py-0.5 rounded w-64 text-center font-mono truncate">
              dayflow.hrms/dashboard/overview
            </div>
            <div className="w-4"></div>
          </div>

          {/* Browser Dashboard Content Area */}
          <div className="p-4 grid grid-cols-[100px_1fr] gap-4 min-h-[200px]">
            {/* Sidebar Mock */}
            <div className="flex flex-col gap-2.5 pr-2 border-r border-hairline-soft text-[9px] font-semibold text-muted text-left">
              <div className="flex items-center gap-1.5 text-ink bg-canvas px-2 py-1 rounded border border-hairline">
                <Activity size={10} className="text-primary" /> Overview
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 hover:text-ink transition-colors">
                <Users size={10} /> Employees
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 hover:text-ink transition-colors">
                <Clock size={10} /> Attendance
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 hover:text-ink transition-colors">
                <Calendar size={10} /> Time Off
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 hover:text-ink transition-colors">
                <CreditCard size={10} /> Payroll
              </div>
            </div>

            {/* Dashboard Inner Grid */}
            <div className="flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-ink">Employee Pulse</span>
                <div className="flex gap-2 text-[8px] font-semibold text-muted">
                  <span className="text-primary font-bold border-b border-primary pb-0.5">Company Wide</span>
                  <span>Engineering</span>
                </div>
              </div>

              {/* Chart Mock */}
              <div className="bg-canvas border border-hairline rounded p-2.5 flex flex-col gap-2">
                <span className="text-[7px] text-muted text-left uppercase tracking-wider font-semibold">
                  Workforce activity metrics
                </span>
                <div className="h-14 flex items-end justify-between px-1 pt-2">
                  <div className="w-3 bg-primary/20 rounded-t h-8"></div>
                  <div className="w-3 bg-primary/30 rounded-t h-12"></div>
                  <div className="w-3 bg-primary/40 rounded-t h-6"></div>
                  <div className="w-3 bg-primary rounded-t h-14"></div>
                  <div className="w-3 bg-primary/80 rounded-t h-10"></div>
                  <div className="w-3 bg-primary/50 rounded-t h-9"></div>
                  <div className="w-3 bg-primary rounded-t h-11"></div>
                  <div className="w-3 bg-primary/20 rounded-t h-5"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Cards (Absolute Overlay) */}
        {/* Card 1: Attendance */}
        <div className="absolute top-20 left-[-20px] z-20 bg-surface-card border border-hairline p-3 rounded-lg w-32 text-left shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-bold text-muted uppercase tracking-wider">Attendance</span>
            <div className="p-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Clock size={8} />
            </div>
          </div>
          <span className="text-xs font-bold text-ink">98.4%</span>
          <p className="text-[8px] text-emerald-600 mt-0.5 font-medium">+1.2% checked in</p>
        </div>

        {/* Card 2: Leave Request */}
        <div className="absolute bottom-12 right-[-15px] z-20 bg-surface-card border border-hairline-strong p-3 rounded-lg w-40 text-left shadow-xs">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-4 h-4 rounded bg-surface-strong flex items-center justify-center text-[8px] font-bold text-ink">
              SM
            </div>
            <div>
              <p className="text-[8px] font-bold text-ink">Sophia Martinez</p>
              <p className="text-[6px] text-muted">Annual Leave Request</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button className="flex-1 bg-primary text-white text-[7px] font-bold py-1 rounded transition-all">
              Approve
            </button>
            <button className="flex-1 bg-surface-card border border-hairline-strong text-ink text-[7px] font-bold py-1 rounded transition-all">
              Reject
            </button>
          </div>
        </div>

        {/* Card 3: Employee Count */}
        <div className="absolute top-[-10px] right-6 z-20 bg-surface-card border border-hairline p-2.5 rounded-lg w-28 text-left shadow-xs">
          <div className="flex items-center gap-1 text-muted mb-0.5">
            <Users size={10} className="text-primary" />
            <span className="text-[8px] font-bold uppercase tracking-wider">Workforce</span>
          </div>
          <span className="text-xs font-bold text-ink">124 Active</span>
          <div className="w-full bg-canvas-soft h-1 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-primary h-full w-[80%] rounded-full"></div>
          </div>
        </div>
      </div>

    </div>
  );
};
