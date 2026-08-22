import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, User, Mail, Phone, Upload, Check } from "lucide-react";
import { authService } from "../services/authService";
import { Logo } from "../components/Logo";
import { InputField } from "../components/InputField";
import { PasswordField } from "../components/PasswordField";
import { AuthIllustration } from "../components/AuthIllustration";

export const Signup = () => {
  const navigate = useNavigate();

  // Form Fields
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  
  // States
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const tempErrors = {};
    if (!companyName.trim()) tempErrors.companyName = "Company Name is required";
    if (!adminName.trim()) tempErrors.adminName = "Administrator Name is required";
    
    // Email regex check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      tempErrors.email = "Email address is required";
    } else if (!emailRegex.test(email)) {
      tempErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      tempErrors.password = "Password is required";
    } else if (password.length < 6) {
      tempErrors.password = "Password must be at least 6 characters long";
    }

    if (password !== confirmPassword) {
      tempErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await authService.signup({
        company_name: companyName,
        admin_name: adminName,
        email,
        phone,
        password,
      });

      // Save company logo if uploaded
      if (logoBase64) {
        localStorage.setItem(`logo_${result.login_id}`, logoBase64);
      }

      // Navigate back to login, passing the newly generated system login_id
      navigate("/login", {
        state: {
          signupSuccess: true,
          loginId: result.login_id,
          email: result.email,
        },
      });
    } catch (err) {
      setApiError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex bg-canvas text-body select-none relative">
      {/* Left side illustration */}
      <AuthIllustration />

      {/* Right side registration form */}
      <div className="w-full lg:w-[42%] flex flex-col justify-between p-8 sm:p-12 md:p-14 xl:p-16 relative bg-canvas z-10 border-l border-hairline-strong overflow-y-auto">
        
        {/* Header section */}
        <div className="flex items-center justify-between w-full mb-6">
          <Logo size="lg" />
          <Link
            to="/login"
            className="text-xs font-semibold bg-surface-card hover:bg-canvas-soft text-ink rounded-md px-4 py-2 border border-hairline-strong transition-all duration-150"
          >
            Sign In
          </Link>
        </div>

        {/* Signup form body */}
        <div className="my-auto max-w-sm w-full mx-auto flex flex-col gap-5 text-center lg:text-left py-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl sm:text-3xl font-normal text-ink tracking-tight">
              Create Dayflow account
            </h2>
            <p className="text-[13px] text-muted">
              Register your organization and deploy your HR platform today.
            </p>
          </div>

          {apiError && (
            <div className="bg-red-500/5 border border-semantic-error/30 rounded-md p-3 text-xs text-semantic-error text-left animate-fade-in flex flex-col gap-1">
              <span className="font-semibold">Registration failed</span>
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            
            {/* Logo Upload Box */}
            <div className="w-full flex flex-col gap-1.5 text-left">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                Organization Brand Logo
              </span>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-hairline-strong rounded-md p-4 bg-surface-card hover:bg-canvas-soft cursor-pointer transition-all duration-150">
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <Upload size={18} className="text-muted" />
                    <span className="text-xs text-muted font-medium">Click to upload company logo</span>
                    <span className="text-[10px] text-muted-soft">PNG, JPG up to 2MB</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {logoBase64 && (
                  <div className="w-16 h-16 border border-hairline rounded-md overflow-hidden bg-surface-strong flex items-center justify-center shrink-0">
                    <img src={logoBase64} alt="Company Logo Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
              </div>
            </div>

            <InputField
              label="Company Name"
              id="company_name"
              placeholder="e.g. Dayflow Corp"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: "" }));
              }}
              error={errors.companyName}
              icon={Building2}
              required
            />

            <InputField
              label="HR / Admin Full Name"
              id="admin_name"
              placeholder="e.g. Sarah Jenkins"
              value={adminName}
              onChange={(e) => {
                setAdminName(e.target.value);
                if (errors.adminName) setErrors((prev) => ({ ...prev, adminName: "" }));
              }}
              error={errors.adminName}
              icon={User}
              required
            />

            <InputField
              label="Work Email Address"
              id="email"
              placeholder="e.g. admin@dayflow.com"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
              }}
              error={errors.email}
              icon={Mail}
              required
            />

            <InputField
              label="Contact Phone"
              id="phone"
              placeholder="e.g. +1 (555) 019-2834"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={Phone}
            />

            <PasswordField
              label="Master Password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
              }}
              error={errors.password}
              required
            />

            <PasswordField
              label="Confirm Password"
              id="confirm_password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              error={errors.confirmPassword}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-md bg-primary hover:bg-primary-active text-white font-bold text-sm py-2.5 px-4 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Register Organization <Check size={15} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer section */}
        <div className="mt-6 text-center text-xs sm:text-[13px] text-muted font-medium">
          Already registered?{" "}
          <Link
            to="/login"
            className="text-primary hover:text-primary-active font-bold transition-colors duration-150"
          >
            Sign In to Workspace
          </Link>
        </div>
      </div>
    </div>
  );
};
