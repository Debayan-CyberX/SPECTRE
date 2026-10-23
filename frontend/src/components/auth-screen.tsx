"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  LockKeyhole,
  ShieldCheck,
  Pause,
  Play,
} from "lucide-react";
import { api } from "@/lib/api";
import { Brand } from "./primitives";
import { Button } from "./ui/button";
const ForensicField = dynamic(() => import("./experience/forensic-field"), {
  ssr: false,
});
const schema = z.object({
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(256),
});
type Credentials = z.infer<typeof schema>;
export function AuthScreen() {
  const [paused, setPaused] = useState(false);
  const client = useQueryClient();
  const form = useForm<Credentials>({
    resolver: zodResolver(schema),
    defaultValues: { username: "analyst", password: "" },
  });
  const login = useMutation({
    mutationFn: (values: Credentials) =>
      api<{ id: string; username: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (user) => {
      client.setQueryData(["me"], user);
    },
  });
  return (
    <main id="main-content" className="auth-screen landscape-auth">
      <div className="auth-landscape">
        <ForensicField mode="terrain" paused={paused} />
        <div className="scene-grain" />
      </div>
      <button
        className="auth-motion-control"
        aria-label={paused ? "Resume ambient motion" : "Pause ambient motion"}
        onClick={() => setPaused((v) => !v)}
      >
        {paused ? <Play size={12} /> : <Pause size={12} />}
        <span>{paused ? "Motion paused" : "Pause motion"}</span>
      </button>
      <div className="auth-story">
        <Link href="/">
          <Brand />
        </Link>
        <span>
          <ShieldCheck size={15} /> Local storage. Private investigations.
        </span>
      </div>
      <div className="auth-form-wrap">
        <form
          onSubmit={form.handleSubmit((values) => login.mutate(values))}
          className="auth-form"
        >
          <div className="auth-lock">
            <LockKeyhole size={22} />
          </div>
          <span className="eyebrow">SPECTRE / LOCAL WORKSPACE</span>
          <h1>Signals from the dark.</h1>
          <p>Sign in with your local analyst account.</p>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            autoComplete="username"
            {...form.register("username")}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
            aria-invalid={!!login.error}
          />
          {(login.error || Object.keys(form.formState.errors).length > 0) && (
            <p className="form-error" role="alert">
              {login.error?.message || "Enter your username and password."}
            </p>
          )}
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? "Signing in…" : "Enter workspace"}
            <ArrowRight size={16} />
          </Button>
          <div className="auth-demo">
            <span>Want to look around first?</span>
            <Link href="/workspace?demo=1">
              Explore the synthetic case <ArrowRight size={14} />
            </Link>
          </div>
          <details className="setup-help">
            <summary>First time running SPECTRE?</summary>
            <p>Initialize your account from the repository root:</p>
            <code>.\.venv\Scripts\python.exe -m spectre.cli init</code>
            <p>Choose a password there, then sign in here.</p>
          </details>
        </form>
      </div>
    </main>
  );
}
