import React from "react";

export const InputField = ({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  icon: Icon,
  required = false,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5 text-left animate-fade-in">
      <label htmlFor={id} className="text-[11px] font-semibold text-muted uppercase tracking-wider">
        {label} {required && <span className="text-semantic-error">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-soft">
            <Icon size={16} />
          </div>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full rounded-md bg-surface-card border ${
            error ? "border-semantic-error" : "border-hairline-strong focus:border-primary"
          } ${Icon ? "pl-10" : "px-4"} py-2.5 text-sm text-ink placeholder-muted-soft focus:outline-none transition-all duration-150`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-semantic-error mt-0.5">{error}</span>}
    </div>
  );
};

