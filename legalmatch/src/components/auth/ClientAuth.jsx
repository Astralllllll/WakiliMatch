import { useState } from "react";
import AuthLayout from "./AuthLayout";
import { loginClient, registerClient } from "./authApi";
import {
  FormField,
  TextInput,
  PasswordInput,
  SubmitButton,
  TabSwitch,
} from "./FormComponents";

function ClientLoginForm({ onAuthSuccess }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email address.";
    if (!form.password) errs.password = "Password is required.";
    else if (form.password.length < 8) errs.password = "Password must be at least 8 characters.";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSuccess(false);
    setLoading(true);
    try {
      const result = await loginClient({
        email: form.email,
        password: form.password,
      });

      if (!result.ok) {
        setLoading(false);
        setErrors({ password: result.error });
        return;
      }

      setLoading(false);
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 700));
      onAuthSuccess?.(result.user);
      return;
    } catch {
      setLoading(false);
      setErrors({ password: "Unable to reach server. Please try again." });
      return;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-1 text-navy">
          Welcome back
        </h2>
        <p className="text-sm text-slate">Sign in to manage your cases and matches.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Email address" id="client-email" error={errors.email}>
          <TextInput
            id="client-email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set("email")}
            hasError={!!errors.email}
          />
        </FormField>

        <FormField label="Password" id="client-password" error={errors.password}>
          <PasswordInput
            id="client-password"
            placeholder="Your password"
            value={form.password}
            onChange={set("password")}
            hasError={!!errors.password}
            minLength={8}
          />
        </FormField>

        <div className="flex justify-end -mt-1">
          <button type="button" className="text-xs text-gold-text hover:underline">
            Forgot password?
          </button>
        </div>

        <SubmitButton loading={loading}>Sign in</SubmitButton>
        {success && (
          <p className="text-xs text-center -mt-1 text-navy">
            Signed in successfully. Redirecting...
          </p>
        )}
      </form>
    </div>
  );
}

function ClientRegisterForm({ onAuthSuccess }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required.";
    if (!form.email) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email address.";
    if (form.phone && !/^(\+254|0)[17]\d{8}$/.test(form.phone.replace(/\s/g, "")))
      errs.phone = "Enter a valid Kenyan phone number.";
    if (!form.password) errs.password = "Password is required.";
    else if (form.password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match.";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSuccess(false);
    setLoading(true);
    try {
      const result = await registerClient({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });

      if (!result.ok) {
        const field = result.field || "email";
        setLoading(false);
        setErrors((prev) => ({ ...prev, [field]: result.error }));
        return;
      }

      setLoading(false);
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 700));
      onAuthSuccess?.(result.user);
      return;
    } catch {
      setLoading(false);
      setErrors({ email: "Unable to reach server. Please try again." });
      return;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-1 text-navy">
          Create your account
        </h2>
        <p className="text-sm text-slate">Find qualified advocates for your legal needs.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Full name" id="client-reg-name" error={errors.fullName}>
          <TextInput
            id="client-reg-name"
            placeholder="Jane Mwangi"
            value={form.fullName}
            onChange={set("fullName")}
            hasError={!!errors.fullName}
          />
        </FormField>

        <FormField label="Email address" id="client-reg-email" error={errors.email}>
          <TextInput
            id="client-reg-email"
            type="email"
            placeholder="jane@example.com"
            value={form.email}
            onChange={set("email")}
            hasError={!!errors.email}
          />
        </FormField>

        <FormField label="Phone number (optional)" id="client-reg-phone" error={errors.phone}>
          <TextInput
            id="client-reg-phone"
            type="tel"
            placeholder="+254 7XX XXX XXX"
            value={form.phone}
            onChange={set("phone")}
            hasError={!!errors.phone}
          />
        </FormField>

        <FormField label="Password" id="client-reg-password" error={errors.password}>
          <PasswordInput
            id="client-reg-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={set("password")}
            hasError={!!errors.password}
          />
        </FormField>

        <FormField label="Confirm password" id="client-reg-confirm" error={errors.confirmPassword}>
          <PasswordInput
            id="client-reg-confirm"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            hasError={!!errors.confirmPassword}
          />
        </FormField>

        <p className="text-xs text-slate -mt-1">
          By creating an account you agree to our{" "}
          <span className="underline cursor-pointer text-gold-text">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="underline cursor-pointer text-gold-text">
            Privacy Policy
          </span>
          .
        </p>

        <SubmitButton loading={loading}>Create account</SubmitButton>
        {success && (
          <p className="text-xs text-center -mt-1 text-navy">
            Account created. Redirecting...
          </p>
        )}
      </form>
    </div>
  );
}

export default function ClientAuth({ onSwitchToLawyer, onSwitchToAdmin, onBack, onAuthSuccess }) {
  const [view, setView] = useState("login");

  return (
    <AuthLayout
      role="client"
      activePortal="client"
      onBack={onBack}
      onSwitchToLawyer={onSwitchToLawyer}
      onSwitchToAdmin={onSwitchToAdmin}
    >
      <TabSwitch
        tabs={[
          { value: "login", label: "Sign in" },
          { value: "register", label: "Register" },
        ]}
        active={view}
        onChange={setView}
      />
      {view === "login" ? (
        <ClientLoginForm onAuthSuccess={onAuthSuccess} />
      ) : (
        <ClientRegisterForm onAuthSuccess={onAuthSuccess} />
      )}
    </AuthLayout>
  );
}
