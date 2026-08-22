import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { authService } from "../services/authService";
import { Logo } from "../components/Logo";
import { InputField } from "../components/InputField";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    // Simple validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError("Email is required");
      return;
    } else if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col justify-between p-6 sm:p-10 md:p-12 relative bg-canvas text-body select-none">
      
      {/* Top logo */}
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
        <Logo size="lg" />
        <Link
          to="/login"
          className="text-xs font-semibold bg-surface-card hover:bg-canvas-soft text-ink rounded-md px-4 py-2 border border-hairline-strong transition-all duration-150"
        >
          Sign In
        </Link>
      </div>

      {/* Main card */}
      <div className="my-auto max-w-md w-full mx-auto bg-surface-card border border-hairline-strong rounded-md p-8 sm:p-10 shadow-xs relative overflow-hidden animate-fade-in">

        {!success ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5 text-left">
              <h2 className="text-2xl font-normal text-ink tracking-tight">
                Reset password
              </h2>
              <p className="text-[13px] text-muted leading-relaxed">
                Enter your registered work email and we'll send you instructions to reset your password.
              </p>
            </div>

            <form onSubmit={handleReset} className="flex flex-col gap-5">
              <InputField
                label="Work Email Address"
                id="reset-email"
                placeholder="e.g. admin@dayflow.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                error={error}
                icon={Mail}
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
                    Send Instructions <Send size={13} />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-6 py-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xl font-bold text-ink">Reset link sent!</h3>
              <p className="text-[13px] text-muted leading-relaxed max-w-xs">
                We've sent password reset instructions to <span className="text-ink font-semibold">{email}</span>. Please check your inbox.
              </p>
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
              className="text-xs font-semibold text-primary hover:text-primary-active transition-colors"
            >
              Resend email instructions
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-hairline">
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted hover:text-ink font-semibold transition-colors duration-150"
          >
            <ArrowLeft size={15} /> Back to Sign In
          </Link>
        </div>
      </div>

      {/* Bottom info */}
      <div className="w-full text-center text-xs text-muted font-medium mt-8 max-w-5xl mx-auto">
        Dayflow HRMS • Secure Enterprise Workspace
      </div>
    </div>
  );
};
