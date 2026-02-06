"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const codeSnippet = "npm install 2027-track";
  
  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <h1 className="text-4xl font-medium mb-12" style={{ color: 'var(--cream)' }}>
        AI Docs Analytics
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        <div className="card-2027 rounded-lg p-8">
          <span className="label-style">Step 1</span>
          <h2 className="text-2xl font-medium mt-2 mb-4" style={{ color: 'var(--cream)' }}>
            Add to your website
          </h2>
          <p className="mb-6" style={{ color: 'var(--cream-dim)' }}>
            Install our lightweight middleware to start tracking AI agent visits on your docs.
          </p>
          
          <div 
            className="rounded-lg p-4 font-mono text-sm mb-4 flex items-center justify-between"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--cream-dark)' }}
          >
            <code style={{ color: 'var(--cream)' }}>{codeSnippet}</code>
            <button
              type="button"
              onClick={handleCopy}
              className="ml-4 px-3 py-1 rounded text-xs transition-colors"
              style={{ 
                color: copied ? 'var(--cream)' : 'var(--cream-dim)',
                background: 'transparent',
                border: '1px solid var(--cream-dark)'
              }}
            >
              {copied ? 'copied!' : 'copy'}
            </button>
          </div>
          
          <a 
            href="https://github.com/team2027/track#readme" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm inline-flex items-center gap-1 transition-colors"
            style={{ color: 'var(--cream-dim)' }}
          >
            view docs →
          </a>
        </div>

        <div className="card-2027 rounded-lg p-8">
          <span className="label-style">Step 2</span>
          <h2 className="text-2xl font-medium mt-2 mb-4" style={{ color: 'var(--cream)' }}>
            Login to see results
          </h2>
          <p className="mb-6" style={{ color: 'var(--cream-dim)' }}>
            Sign in with your work email to see analytics for your domain.
          </p>
          
          <form onSubmit={handleSubmit}>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-2027 w-full rounded-lg px-4 py-3 mb-4"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-glow w-full py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? "sending..." : "send magic link"}
            </button>
          </form>
          
          <p className="text-sm mt-6" style={{ color: 'var(--cream-dark)' }}>
            you'll see data for domains matching your email
          </p>
        </div>
      </div>
    </div>
  );
}
