"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function CustomerSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("prefer_not_to_say");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"register" | "verify">("register");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!photo) { setPhotoPreview(""); return; }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function validateDetails() {
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      throw new Error("Username must be 3–24 characters and use only letters, numbers, or underscores.");
    }
    if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
    if (password !== confirmPassword) throw new Error("The passwords do not match.");
    if (!dateOfBirth) throw new Error("Enter your date of birth.");
    const birth = new Date(dateOfBirth + "T00:00:00");
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    if (Number.isNaN(birth.getTime()) || birth > today || age < 13 || age > 120) {
      throw new Error("You must enter a valid date of birth and be at least 13 years old.");
    }
    if (photo && (!["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 5 * 1024 * 1024)) {
      throw new Error("Profile photos must be JPG, PNG, or WebP and no larger than 5 MB.");
    }
  }

  async function saveOptionalPhoto(userId: string) {
    if (!photo) return "";
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("business-media").upload(path, photo, {
      contentType: photo.type, upsert: false,
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("business-media").getPublicUrl(path);
    const { error: metadataError } = await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
    if (metadataError) throw metadataError;
    return data.publicUrl;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      validateDetails();
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username.trim().toLowerCase();
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: name.trim(),
            username: cleanUsername,
            date_of_birth: dateOfBirth,
            gender,
          },
          emailRedirectTo: `${window.location.origin}/account/login?confirmed=1`,
        },
      });
      if (signupError) throw signupError;
      if (data.session && data.user) {
        if (photo) {
          try { await saveOptionalPhoto(data.user.id); }
          catch { setNotice("Your account was created, but the profile photo could not be uploaded. You can add it later."); }
        }
        router.replace("/account"); router.refresh();
      } else {
        setStep("verify");
        setNotice(`A confirmation code was requested for ${cleanEmail}. Check Inbox and Spam, then enter the code below.`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (/rate limit|over_email_send_rate_limit/i.test(message)) setError("Email sending is temporarily rate-limited. Wait before requesting another code, then try again.");
      else setError(message || "We couldn't create your account. Please try again.");
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(), token: code.trim(), type: "signup",
      });
      if (verifyError) throw verifyError;
      if (photo && data.user) {
        try { await saveOptionalPhoto(data.user.id); }
        catch { setNotice("Your account is verified, but the profile photo could not be uploaded. You can add it later."); }
      }
      router.replace("/account"); router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The code could not be verified. Request a new code and try again.");
    } finally { setBusy(false); }
  }

  async function resend() {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup", email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/account/login?confirmed=1` },
      });
      if (resendError) throw resendError;
      setCode(""); setNotice("A new confirmation code was requested. Check your email.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't resend the code. Please wait and try again.");
    } finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="card auth-card">
      <Link href="/" className="brand">EAZREAL<span>PERSONAL ACCOUNT</span></Link>
      <h1 style={{ marginTop: 26, marginBottom: 8 }}>{step === "register" ? "Create your account" : "Confirm your email"}</h1>
      <p style={{ color: "#627d98", lineHeight: 1.6 }}>{step === "register" ? "Join EAZREAL to connect with people, discover businesses and share updates." : `Enter the confirmation code sent to ${email.trim().toLowerCase()}.`}</p>
      {step === "register" ? <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 22 }}>
        <label style={fieldLabel}>Profile photo (optional)
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setPhoto(e.target.files?.[0] || null)} style={fileStyle} />
          <small style={{ color: "#627d98", fontWeight: 400 }}>JPG, PNG or WebP · Maximum 5 MB</small>
          {photoPreview && <img src={photoPreview} alt="Profile photo preview" style={previewStyle} />}
        </label>
        <label style={fieldLabel}>Full name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={120} style={fieldStyle} /></label>
        <label style={fieldLabel}>Username<input value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())} autoComplete="username" required minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" placeholder="e.g. isreal_ayo" style={fieldStyle} /><small style={{ color: "#627d98", fontWeight: 400 }}>3–24 letters, numbers or underscores.</small></label>
        <label style={fieldLabel}>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required style={fieldStyle} /></label>
        <label style={fieldLabel}>Date of birth<input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} autoComplete="bday" required max={new Date().toISOString().slice(0, 10)} style={fieldStyle} /></label>
        <label style={fieldLabel}>Gender
          <select value={gender} onChange={e => setGender(e.target.value)} style={fieldStyle}>
            <option value="prefer_not_to_say">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
            <option value="self_described">I describe myself another way</option>
          </select>
        </label>
        <label style={fieldLabel}>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required style={fieldStyle} /><small style={{ color: "#627d98", fontWeight: 400 }}>Use at least 8 characters.</small></label>
        <label style={fieldLabel}>Confirm password<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={8} required style={fieldStyle} /></label>
        {error && <p role="alert" style={alertStyle}>{error}</p>}
        {notice && <p role="status" style={noticeStyle}>{notice}</p>}
        <button className="btn primary" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        <small style={{ color: "#667085", lineHeight: 1.5 }}>By creating an account, you confirm that the details you provide are accurate. Your date of birth and gender are stored in your account profile.</small>
      </form> : <form onSubmit={verify} style={{ display: "grid", gap: 14, marginTop: 22 }}>
        <label style={fieldLabel}>Confirmation code<input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} required placeholder="Enter email code" style={{ ...fieldStyle, textAlign: "center", letterSpacing: ".25em", fontSize: 22 }} /></label>
        {error && <p role="alert" style={alertStyle}>{error}</p>}
        {notice && <p role="status" style={noticeStyle}>{notice}</p>}
        <button className="btn primary" disabled={busy || code.length < 6}>{busy ? "Verifying…" : "Confirm email and continue"}</button>
        <button type="button" className="btn secondary" disabled={busy} onClick={resend}>Resend code</button>
        <button type="button" onClick={() => { setStep("register"); setCode(""); setError(""); setNotice(""); }} style={textButton}>Change details</button>
      </form>}
      <p style={{ marginTop: 18, color: "#627d98" }}>Already registered? <Link href="/account/login" style={link}>Sign in</Link></p>
      <Link href="/chat" style={link}>Continue to support chat without an account</Link>
    </section>
  </main>;
}

const fieldLabel = { display: "grid", gap: 6, fontWeight: 600 } as const;
const fieldStyle = { width: "100%", boxSizing: "border-box" as const, padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, font: "inherit", background: "white" };
const fileStyle = { width: "100%", boxSizing: "border-box" as const, padding: 10, border: "1px solid #cbd5e1", borderRadius: 10, background: "white" };
const previewStyle = { width: 76, height: 76, objectFit: "cover" as const, borderRadius: "50%", border: "2px solid #e2e8f0" };
const link = { color: "#1464f4" };
const textButton = { border: 0, background: "transparent", color: "#1464f4", padding: 8, font: "inherit", cursor: "pointer" } as const;
const alertStyle = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b42318", overflowWrap: "anywhere" as const };
const noticeStyle = { margin: 0, padding: 12, borderRadius: 10, border: "1px solid #b7e4c7", background: "#effaf3", color: "#155e35", overflowWrap: "anywhere" as const };
