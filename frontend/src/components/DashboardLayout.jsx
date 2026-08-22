import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Activity, 
  Users, 
  Clock, 
  Calendar, 
  User as UserIcon, 
  Settings as SettingsIcon, 
  Menu, 
  X, 
  Bell, 
  Search, 
  ChevronDown, 
  LogOut,
  CreditCard
} from "lucide-react";
import { authService } from "../services/authService";
import { notificationRepository } from "../data/notifications";
import { Logo } from "./Logo";

export const DashboardLayout = ({ children, onSearch }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Search input state
  const [searchVal, setSearchVal] = useState("");

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate("/login");
    } else {
      setCurrentUser(user);
    }

    // Load mock notifications
    const mockNotifs = notificationRepository.getAll();
    setNotifications(mockNotifs);
    setUnreadCount(notificationRepository.getUnreadCount());
  }, [navigate, location.pathname]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const handleMarkAllRead = () => {
    const updated = notificationRepository.markAllAsRead();
    setNotifications(updated);
    setUnreadCount(0);
  };

  const handleNotificationClick = (id) => {
    notificationRepository.markAsRead(id);
    setNotifications(notificationRepository.getAll());
    setUnreadCount(notificationRepository.getUnreadCount());
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    if (onSearch) {
      onSearch(val);
    }
  };

  const isEmployee = currentUser?.role?.toUpperCase() === "EMPLOYEE";
  const menuItems = isEmployee
    ? [
        { name: "Dashboard", path: "/dashboard", icon: Activity },
        { name: "Employees", path: "/employees", icon: Users },
        { name: "My Attendance", path: "/attendance", icon: Clock },
        { name: "My Time Off", path: "/time-off", icon: Calendar },
        { name: "My Profile", path: "/profile", icon: UserIcon },
        { name: "Settings", path: "/settings", icon: SettingsIcon },
      ]
    : [
        { name: "Dashboard", path: "/dashboard", icon: Activity },
        { name: "Employees", path: "/employees", icon: Users },
        { name: "Attendance", path: "/attendance", icon: Clock },
        { name: "Time Off", path: "/time-off", icon: Calendar },
        { name: "Payroll / Salary", path: "/payroll", icon: CreditCard },
        { name: "My Profile", path: "/profile", icon: UserIcon },
        { name: "Settings", path: "/settings", icon: SettingsIcon },
      ];

  if (!currentUser) return null;

  return (
    <div className="flex h-screen bg-canvas text-body font-sans overflow-hidden">
      
      {/* SIDEBAR - DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-canvas border-r border-hairline shrink-0 justify-between p-6">
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <Logo />
          </div>

          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path === "/employees" && location.pathname.startsWith("/employees/"));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-[14px] font-medium transition-all duration-150 border-l-2 ${
                    isActive
                      ? "bg-surface-card text-ink border-primary font-semibold"
                      : "text-body border-transparent hover:text-ink hover:bg-canvas-soft"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-primary" : "text-muted"} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-hairline flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-md bg-surface-strong border border-hairline flex items-center justify-center text-ink font-bold text-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-[13px] font-semibold text-ink truncate">{currentUser.name}</span>
              <span className="text-[10px] text-muted uppercase tracking-wider font-semibold truncate">{currentUser.role}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-[12px] font-semibold text-ink bg-surface-card hover:bg-canvas-soft border border-hairline-strong transition-all duration-150"
          >
            <LogOut size={13} /> Log Out
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-ink/30 backdrop-blur-xs">
          <div className="w-64 bg-canvas border-r border-hairline flex flex-col justify-between p-6 animate-fade-in">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-md text-muted hover:text-ink hover:bg-canvas-soft border border-hairline"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path === "/employees" && location.pathname.startsWith("/employees/"));
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-[14px] font-medium transition-all border-l-2 ${
                        isActive
                          ? "bg-surface-card text-ink border-primary font-semibold"
                          : "text-body border-transparent hover:text-ink hover:bg-canvas-soft"
                      }`}
                    >
                      <Icon size={18} className={isActive ? "text-primary" : "text-muted"} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-6 border-t border-hairline flex flex-col gap-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 rounded-md bg-surface-strong border border-hairline flex items-center justify-center text-ink font-bold text-sm">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-[13px] font-semibold text-ink truncate">{currentUser.name}</span>
                  <span className="text-[10px] text-muted uppercase tracking-wider font-semibold truncate">{currentUser.role}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-[12px] font-semibold text-ink bg-surface-card hover:bg-canvas-soft border border-hairline-strong transition-all duration-150"
              >
                <LogOut size={13} /> Log Out
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileOpen(false)}></div>
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP NAVIGATION BAR (64px height) */}
        <header className="h-[64px] border-b border-hairline bg-surface-card px-6 flex items-center justify-between shrink-0 relative z-20">
          
          {/* Left: Mobile Toggle & Page Indicator */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded-md text-muted hover:text-ink border border-hairline hover:bg-canvas-soft"
            >
              <Menu size={20} />
            </button>

            {/* Dynamic Search Box */}
            <div className="relative w-44 sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={searchVal}
                onChange={handleSearchChange}
                placeholder="Search staff, cards..."
                className="w-full bg-canvas-soft border border-hairline rounded-md py-1.5 pl-9 pr-4 text-[13px] text-ink focus:outline-none focus:border-primary placeholder-muted-soft transition-all duration-150"
              />
            </div>
          </div>

          {/* Right: Notifications & Profile dropdown */}
          <div className="flex items-center gap-4">
            
            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileDropdownOpen(false);
                }}
                className="p-2 rounded-md hover:bg-canvas-soft text-muted hover:text-ink border border-transparent hover:border-hairline transition-all relative"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-surface-card border border-hairline-strong rounded-lg shadow-sm z-40 py-2 animate-fade-in text-left">
                    <div className="px-4 py-2 border-b border-hairline flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-ink">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] font-medium text-primary hover:text-primary-active"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-[12px] text-muted">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              handleNotificationClick(n.id);
                              setNotificationsOpen(false);
                            }}
                            className={`p-3 border-b border-hairline-soft cursor-pointer hover:bg-canvas-soft transition-all ${
                              !n.read ? "bg-canvas-soft/40 border-l-2 border-primary" : ""
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[12px] font-medium text-ink">{n.title}</span>
                              <span className="text-[9px] text-muted shrink-0">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-muted mt-1 leading-snug">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileDropdownOpen(!profileDropdownOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 p-1 rounded-md hover:bg-canvas-soft border border-transparent hover:border-hairline transition-all duration-150"
              >
                <div className="w-7 h-7 rounded-md bg-surface-strong border border-hairline flex items-center justify-center text-xs font-bold text-ink">
                  {currentUser.name.charAt(0)}
                </div>
                <ChevronDown size={14} className="text-muted" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setProfileDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-surface-card border border-hairline-strong rounded-lg shadow-sm z-40 py-2 animate-fade-in text-left">
                    <div className="px-4 py-2 border-b border-hairline text-[11px] text-muted font-medium truncate">
                      Signed in as <br /><span className="text-ink font-semibold">{currentUser.email}</span>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium text-ink hover:bg-canvas-soft transition-all"
                    >
                      <UserIcon size={13} /> My Profile
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium text-ink hover:bg-canvas-soft transition-all"
                    >
                      <SettingsIcon size={13} /> Settings
                    </Link>
                    <div className="border-t border-hairline my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium text-semantic-error hover:bg-red-500/5 transition-all text-left"
                    >
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* PAGE BODY */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-canvas-soft">
          {children}
        </main>
      </div>

    </div>
  );
};
