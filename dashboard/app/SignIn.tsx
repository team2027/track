"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn("resend", { email });
      setSent(true);
    } catch (err) {
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="card-2027 rounded-lg p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-6">✉️</div>
          <h2 className="text-2xl font-medium mb-3" style={{ color: 'var(--cream)' }}>
            check your email
          </h2>
          <p style={{ color: 'var(--cream-dim)' }}>
            we sent a magic link to{' '}
            <span style={{ color: 'var(--cream)' }}>{email}</span>
          </p>
          <p className="text-sm mt-6" style={{ color: 'var(--cream-dark)' }}>
            click the link to sign in. you can close this tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="card-2027 rounded-lg p-10 max-w-md w-full">
        <h1 className="text-3xl font-medium mb-3" style={{ color: 'var(--cream)' }}>
          AI Docs Analytics
        </h1>
        <p className="mb-8" style={{ color: 'var(--cream-dim)' }}>
          sign in with your work email to see analytics for your domain
        </p>
        <form onSubmit={handleSubmit}>
          <label 
            htmlFor="email" 
            className="label-style block mb-2"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-2027 w-full rounded-lg px-4 py-3 mb-6"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-glow w-full py-3 rounded-lg text-lg disabled:opacity-50"
          >
            {loading ? "sending..." : "send magic link"}
          </button>
        </form>
        <p className="text-sm mt-8 text-center" style={{ color: 'var(--cream-dark)' }}>
          you'll automatically see data for domains matching your email
        </p>
      </div>
    </div>
  );
}
