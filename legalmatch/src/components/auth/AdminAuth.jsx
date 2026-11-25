import { useState } from "react";
import AuthLayout from "./AuthLayout";
import { loginAdmin } from "./authApi";
import { FormField, PasswordInput, SubmitButton, TextInput } from "./FormComponents";

export default function AdminAuth({ onSwitchToClient, onSwitchToLawyer, onBack, onAuthSuccess }) {
  const [form, setForm] = useState({ email: "", password: "", code: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  // Generic failure message shared across every field - never reveals which
  // of email/password/code was wrong (brief section 3).
  const [formError, setFormError] = useState("");

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email address.";
    if (!form.password) errs.password = "Password is required.";
    if (!form.code) errs.code = "Access code is required.";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});
    setFormError("");

    try {
      const result = await loginAdmin({ email: form.email, password: form.password, code: form.code });
      if (!result.ok) {
        setFormError(result.error || "Invalid credentials.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onAuthSuccess?.(result.user, { adminSessionToken: result.adminSessionToken });
    } catch {
      setLoading(false);
      setFormError("Unable to reach server. Please try again.");
    }
  };

  return (
    <AuthLayout
      role="lawyer"
      activePortal="admin"
      onBack={onBack}
      onSwitchToClient={onSwitchToClient}
      onSwitchToLawyer={onSwitchToLawyer}
    >
      <div>
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "#EFF6FF", color: "#1D4ED8" }}>
            Admin portal
          </div>
          <h2 className="text-2xl font-semibold mb-1" style={{ color: "#0F2744" }}>
            Admin sign in
          </h2>
          <p className="text-sm text-gray-500">Manage clients, lawyers, and posted cases.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormField label="Admin email" id="admin-email" error={errors.email}>
            <TextInput
              id="admin-email"
              type="email"
              placeholder="admin@legalmatch.co.ke"
              value={form.email}
              onChange={set("email")}
              hasError={!!errors.email}
            />
          </FormField>

          <FormField label="Password" id="admin-password" error={errors.password}>
            <PasswordInput
              id="admin-password"
              placeholder="Your password"
              value={form.password}
              onChange={set("password")}
              hasError={!!errors.password}
            />
          </FormField>

          <FormField label="Access code" id="admin-code" error={errors.code}>
            <PasswordInput
              id="admin-code"
              placeholder="Secret access code"
              value={form.code}
              onChange={set("code")}
              hasError={!!errors.code}
            />
          </FormField>

          {formError && (
            <p className="text-xs text-center" style={{ color: "#DC2626" }}>{formError}</p>
          )}

          <SubmitButton loading={loading}>Sign in as admin</SubmitButton>
        </form>
      </div>
    </AuthLayout>
  );
}
