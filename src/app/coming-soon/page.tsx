"use client";

import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email) return setMsg("Please enter your email.");
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg("🎉 You're on the list! Check your inbox.");
        setEmail("");
      } else {
        setMsg(data.error || "Something went wrong.");
      }
    } catch {
      setMsg("Network error, please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-white px-4 text-center">
      <div className="max-w-lg">
        {/* Logo */}
        <div className="flex justify-center items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-purple-600" />
          <span className="font-bold text-xl">Lemyte</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold mb-4">
          🚧 We’re Building Something Awesome
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Lemyte is almost ready!  
          We’re crafting expert-led workshops and hands-on learning experiences.  
          Be the first to know when we launch.
        </p>

        {/* Email Signup */}
        <form onSubmit={handleSubscribe} className="flex gap-2 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="flex-1 rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : <>Notify Me <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

        {/* Footer */}
        <p className="mt-8 text-xs text-gray-500">
          © {new Date().getFullYear()} Lemyte. All rights reserved.
        </p>
      </div>
    </main>
  );
}
