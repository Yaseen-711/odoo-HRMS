import React, { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

export const PasswordField = ({
  label,
  id,
  placeholder = "••••••••",
  value,
  onChange,
  error,
  required = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = (e) => {
    e.preventDefault();
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="w-full flex flex-col gap-1.5 text-left animate-fade-in">
      <label htmlFor={id} className="text-[11px] font-semibold text-muted uppercase tracking-wider">
        {label} {required && <span className="text-semantic-error">*</span>}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-soft">
          <Lock size={16} />
        </div>
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full rounded-md bg-surface-card border ${
            error ? "border-semantic-error" : "border-hairline-strong focus:border-primary"
          } pl-10 pr-10 py-2.5 text-sm text-ink placeholder-muted-soft focus:outline-none transition-all duration-150`}
          {...props}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-ink transition-colors duration-150"
          tabIndex="-1"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <span className="text-xs text-semantic-error mt-0.5">{error}</span>}
    </div>
  );
};

