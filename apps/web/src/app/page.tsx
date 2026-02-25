"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Shield,
  Activity,
  AlertTriangle,
  Database,
  FileCheck,
  Github,
  Star,
  Check,
  ChevronRight,
  Terminal,
  BarChart3,
  Globe,
  Lock,
  Cable,
  Settings,
  Rocket,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Intersection Observer hook for scroll-triggered animations         */
/* ------------------------------------------------------------------ */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const children = el.querySelectorAll(".reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ------------------------------------------------------------------ */
/*  Landing Page                                                        */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const rootRef = useScrollReveal();

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-x-hidden">
      {/* ---- Inline keyframes & reveal classes ---- */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(1deg);
          }
        }

        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes typing {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }

        .hero-gradient {
          background: linear-gradient(
            135deg,
            #f0f4ff 0%,
            #e0e7ff 25%,
            #f5f3ff 50%,
            #eef2ff 75%,
            #f0f4ff 100%
          );
          background-size: 400% 400%;
          animation: gradient-shift 15s ease infinite;
        }

        .float-animation {
          animation: float 6s ease-in-out infinite;
        }

        .float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }

        .glow-pulse {
          animation: pulse-glow 3s ease-in-out infinite;
        }

        .hero-enter {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .hero-enter-delay-1 {
          animation: fade-in-up 0.8s ease-out 0.15s forwards;
          opacity: 0;
        }

        .hero-enter-delay-2 {
          animation: fade-in-up 0.8s ease-out 0.3s forwards;
          opacity: 0;
        }

        .hero-enter-delay-3 {
          animation: fade-in-up 0.8s ease-out 0.45s forwards;
          opacity: 0;
        }

        .shimmer-line {
          background: linear-gradient(
            90deg,
            #e2e8f0 25%,
            #f1f5f9 50%,
            #e2e8f0 75%
          );
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }

        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }

        .reveal-delay-1 {
          transition-delay: 0.1s;
        }
        .reveal-delay-2 {
          transition-delay: 0.2s;
        }
        .reveal-delay-3 {
          transition-delay: 0.3s;
        }
        .reveal-delay-4 {
          transition-delay: 0.4s;
        }
        .reveal-delay-5 {
          transition-delay: 0.5s;
        }

        .code-block {
          font-family: var(--font-geist-mono), ui-monospace, monospace;
        }
      ` }} />

      {/* ============================================================ */}
      {/*  NAVIGATION                                                   */}
      {/* ============================================================ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white font-bold text-sm">
                O5
              </div>
              <span className="text-lg font-semibold tracking-tight text-gray-900">
                OpenFive
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
              <a href="#features" className="hover:text-gray-900 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-gray-900 transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="hover:text-gray-900 transition-colors">
                Pricing
              </a>
              <a
                href="https://github.com/openfive/openfive"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900 transition-colors flex items-center gap-1"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors shadow-sm"
              >
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/*  HERO SECTION                                                 */}
      {/* ============================================================ */}
      <section className="hero-gradient relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl glow-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-200/20 rounded-full blur-3xl glow-pulse" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100/20 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left - Copy */}
            <div className="max-w-2xl">
              <div className="hero-enter inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/80 px-4 py-1.5 text-sm text-gray-600 mb-8 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                Open source &middot; Self-hostable &middot; Apache 2.0
              </div>

              <h1 className="hero-enter-delay-1 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.08]">
                Stop Overpaying
                <br />
                for{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                  AI Inference
                </span>
              </h1>

              <p className="hero-enter-delay-2 mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-lg">
                OpenFive is the open-source LLM gateway that routes, budgets,
                and monitors every token &mdash; so your agents never burn cash.
              </p>

              <div className="hero-enter-delay-3 mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-8 py-3.5 text-base font-semibold text-white hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 hover:-translate-y-0.5"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://github.com/openfive/openfive"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white/60 backdrop-blur-sm px-8 py-3.5 text-base font-semibold text-gray-700 hover:border-gray-400 hover:bg-white transition-all hover:-translate-y-0.5"
                >
                  <Github className="h-5 w-5" />
                  View on GitHub
                </a>
              </div>

              <div className="hero-enter-delay-3 mt-10 flex items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" />
                  5-minute setup
                </span>
              </div>
            </div>

            {/* Right - Dashboard Mockup */}
            <div className="hero-enter-delay-3 relative">
              <div className="float-slow relative">
                {/* Glow behind */}
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-purple-500/10 rounded-3xl blur-2xl" />

                {/* Dashboard Card */}
                <div className="relative rounded-2xl border border-gray-200/80 bg-white/90 backdrop-blur-xl shadow-2xl shadow-gray-900/10 overflow-hidden">
                  {/* Title Bar */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/80 border-b border-gray-200/50">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="ml-3 flex-1 h-5 rounded-md bg-gray-200/60 max-w-xs" />
                  </div>

                  {/* Dashboard Content */}
                  <div className="p-6 space-y-5">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Total Requests", value: "1.2M", trend: "+12%" },
                        { label: "Cost Saved", value: "$4,280", trend: "+34%" },
                        { label: "Avg Latency", value: "142ms", trend: "-8%" },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-xl bg-gray-50 p-4 border border-gray-100"
                        >
                          <p className="text-xs text-gray-500 font-medium">
                            {stat.label}
                          </p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {stat.value}
                          </p>
                          <span className="text-xs font-medium text-emerald-600">
                            {stat.trend}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Chart Mockup */}
                    <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-700">
                          Cost Over Time
                        </span>
                        <span className="text-xs text-gray-400">Last 7 days</span>
                      </div>
                      <div className="flex items-end gap-1 h-24">
                        {[40, 55, 35, 65, 45, 80, 60, 70, 50, 75, 55, 85, 65, 90, 70, 60, 80, 55, 75, 95, 70, 85, 60, 78].map(
                          (h, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-500 to-indigo-400"
                              style={{
                                height: `${h}%`,
                                opacity: 0.4 + (h / 100) * 0.6,
                              }}
                            />
                          )
                        )}
                      </div>
                    </div>

                    {/* Request Log Mockup */}
                    <div className="space-y-2">
                      {[
                        { model: "gpt-4o", cost: "$0.003", latency: "180ms", status: "success" },
                        { model: "claude-sonnet", cost: "$0.002", latency: "95ms", status: "success" },
                        { model: "llama-3.1", cost: "$0.001", latency: "45ms", status: "success" },
                      ].map((log) => (
                        <div
                          key={log.model}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50/60 border border-gray-100 text-sm"
                        >
                          <span className="font-medium text-gray-700 font-mono text-xs">
                            {log.model}
                          </span>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{log.cost}</span>
                            <span>{log.latency}</span>
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SOCIAL PROOF STRIP                                          */}
      {/* ============================================================ */}
      <section className="border-b border-gray-100 bg-white py-12">
        <div className="reveal mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-8">
            Trusted by teams building with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-2xl font-semibold text-gray-300">
            <span className="hover:text-gray-400 transition-colors">OpenAI</span>
            <span className="hover:text-gray-400 transition-colors">Anthropic</span>
            <span className="hover:text-gray-400 transition-colors">Google</span>
            <span className="hover:text-gray-400 transition-colors">Meta</span>
            <span className="hover:text-gray-400 transition-colors">Mistral</span>
            <span className="hover:text-gray-400 transition-colors">Cohere</span>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURES GRID                                               */}
      {/* ============================================================ */}
      <section id="features" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-3">
              Everything you need
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              One gateway to rule them all
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Smart routing, budget enforcement, and real-time observability
              built into a single lightweight proxy.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Smart Routing",
                description:
                  "Automatically routes to the best model based on cost, latency, and reliability. Failover built-in.",
                color: "text-amber-500",
                bg: "bg-amber-50",
              },
              {
                icon: Shield,
                title: "Budget Control",
                description:
                  "Set hard and soft budgets per environment, project, or route. Kill switch activates automatically.",
                color: "text-emerald-500",
                bg: "bg-emerald-50",
              },
              {
                icon: Activity,
                title: "Real-time Observability",
                description:
                  "Track every request with cost, latency, and model details. Live streaming logs with zero overhead.",
                color: "text-blue-500",
                bg: "bg-blue-50",
              },
              {
                icon: AlertTriangle,
                title: "Anomaly Detection",
                description:
                  "Detect cost spikes and infinite loops. Automatic kill switch protection keeps your wallet safe.",
                color: "text-red-500",
                bg: "bg-red-50",
              },
              {
                icon: Database,
                title: "Prompt Caching",
                description:
                  "Semantic cache saves 30-50% on repeated prompts. Content-addressable storage with TTL controls.",
                color: "text-violet-500",
                bg: "bg-violet-50",
              },
              {
                icon: FileCheck,
                title: "Schema Validation",
                description:
                  "JSON Schema output validation with auto-repair. Ensure every response matches your expectations.",
                color: "text-indigo-500",
                bg: "bg-indigo-50",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className={`reveal reveal-delay-${(i % 3) + 1} group relative rounded-2xl border border-gray-100 bg-white p-8 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100 transition-all duration-300 hover:-translate-y-1`}
              >
                <div
                  className={`inline-flex items-center justify-center rounded-xl ${feature.bg} p-3 mb-5`}
                >
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  DASHBOARD PREVIEW                                           */}
      {/* ============================================================ */}
      <section className="bg-gray-50 py-24 sm:py-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Everything you need in one dashboard
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Monitor costs, debug requests, and manage routing rules from a
              beautiful, unified interface.
            </p>
          </div>

          <div className="reveal relative">
            {/* Glow */}
            <div className="absolute -inset-8 bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-purple-500/5 rounded-3xl blur-3xl" />

            {/* Dashboard Frame */}
            <div className="relative rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/50 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="ml-4 flex-1 flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-4 py-1.5 text-sm text-gray-400 max-w-md">
                  <Lock className="h-3.5 w-3.5" />
                  app.openfive.dev/overview
                </div>
              </div>

              {/* Dashboard Layout */}
              <div className="flex min-h-[480px]">
                {/* Sidebar */}
                <div className="hidden sm:block w-56 bg-gray-50/50 border-r border-gray-100 p-4 space-y-1">
                  {[
                    { icon: BarChart3, label: "Overview", active: true },
                    { icon: Globe, label: "Routes" },
                    { icon: Activity, label: "Live Logs" },
                    { icon: Shield, label: "Budgets" },
                    { icon: Database, label: "Cache" },
                    { icon: Settings, label: "Settings" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                        item.active
                          ? "bg-white shadow-sm border border-gray-100 text-gray-900 font-medium"
                          : "text-gray-500"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </div>
                  ))}
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 space-y-6">
                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Total Spend", value: "$1,247.32", change: "+8.2%", up: true },
                      { label: "Requests", value: "847,293", change: "+23.1%", up: true },
                      { label: "Cache Hit Rate", value: "42.8%", change: "+5.2%", up: true },
                      { label: "Avg Latency", value: "127ms", change: "-12.4%", up: false },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-gray-100 bg-white p-4"
                      >
                        <p className="text-xs text-gray-500">{stat.label}</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          {stat.value}
                        </p>
                        <p
                          className={`text-xs font-medium mt-1 ${
                            stat.label === "Avg Latency"
                              ? "text-emerald-600"
                              : stat.up
                                ? "text-emerald-600"
                                : "text-red-500"
                          }`}
                        >
                          {stat.change} vs last week
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Large Chart Area */}
                  <div className="rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Cost by Provider
                      </h3>
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                          OpenAI
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-violet-500" />
                          Anthropic
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Ollama
                        </span>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 h-32">
                      {[
                        [50, 30, 20],
                        [45, 35, 25],
                        [60, 25, 15],
                        [55, 40, 20],
                        [70, 30, 25],
                        [65, 45, 30],
                        [50, 35, 20],
                        [75, 40, 25],
                        [60, 50, 30],
                        [80, 45, 35],
                        [70, 55, 25],
                        [85, 50, 40],
                      ].map((bars, i) => (
                        <div key={i} className="flex-1 flex flex-col gap-0.5">
                          <div
                            className="rounded-t-sm bg-indigo-500"
                            style={{ height: `${bars[0]}%` }}
                          />
                          <div
                            className="bg-violet-500"
                            style={{ height: `${bars[1]}%` }}
                          />
                          <div
                            className="rounded-b-sm bg-emerald-500"
                            style={{ height: `${bars[2]}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                */}
      {/* ============================================================ */}
      <section id="how-it-works" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-3">
              Simple setup
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Up and running in minutes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: "01",
                icon: Cable,
                title: "Connect Your Providers",
                description:
                  "Connect OpenRouter, Ollama, or any OpenAI-compatible provider. Bring your own API keys securely.",
              },
              {
                step: "02",
                icon: Settings,
                title: "Configure Routes",
                description:
                  "Set up intelligent routing with budget controls, failover chains, and model preferences per use case.",
              },
              {
                step: "03",
                icon: Rocket,
                title: "Ship With Confidence",
                description:
                  "Your agents get the best model at the best price, every time. Automatic failover and budget protection.",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`reveal reveal-delay-${i + 1} relative text-center`}
              >
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-gray-200 to-transparent" />
                )}

                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 mb-6 shadow-sm">
                  <item.icon className="h-10 w-10 text-gray-700" />
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-md">
                    {item.step}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CODE EXAMPLE                                                */}
      {/* ============================================================ */}
      <section className="bg-gray-950 py-24 sm:py-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left - Copy */}
            <div className="reveal">
              <p className="text-sm font-semibold text-indigo-400 tracking-wide uppercase mb-3">
                Developer experience
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Drop-in replacement
                <br />
                for the OpenAI SDK
              </h2>
              <p className="mt-4 text-lg text-gray-400 leading-relaxed">
                One line change. That&apos;s it. Swap your base URL to OpenFive
                and get intelligent routing, budget controls, and full
                observability without changing a single line of application code.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "OpenAI SDK compatible API",
                  "TypeScript & Python SDKs",
                  "Streaming support out of the box",
                  "Function calling & tool use support",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-gray-300">
                    <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Code Block */}
            <div className="reveal reveal-delay-2">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-purple-500/10 rounded-2xl blur-xl" />

                <div className="relative rounded-xl border border-gray-800 bg-gray-900 overflow-hidden shadow-2xl">
                  {/* Tab bar */}
                  <div className="flex items-center gap-4 px-4 py-3 bg-gray-900/80 border-b border-gray-800">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-gray-700" />
                      <div className="w-3 h-3 rounded-full bg-gray-700" />
                      <div className="w-3 h-3 rounded-full bg-gray-700" />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Terminal className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-gray-400">app.ts</span>
                    </div>
                  </div>

                  {/* Code */}
                  <div className="p-6 text-sm leading-7 code-block overflow-x-auto">
                    <div>
                      <span className="text-violet-400">import</span>
                      <span className="text-gray-300">{" { "}</span>
                      <span className="text-amber-300">OpenFiveClient</span>
                      <span className="text-gray-300">{" } "}</span>
                      <span className="text-violet-400">from</span>
                      <span className="text-emerald-400">{" '@openfive/sdk'"}</span>
                    </div>
                    <div className="mt-4">
                      <span className="text-violet-400">const</span>
                      <span className="text-blue-300"> client</span>
                      <span className="text-gray-400"> = </span>
                      <span className="text-violet-400">new</span>
                      <span className="text-amber-300"> OpenFiveClient</span>
                      <span className="text-gray-300">{"({"}</span>
                    </div>
                    <div>
                      <span className="text-gray-300">{"  "}</span>
                      <span className="text-blue-300">apiKey</span>
                      <span className="text-gray-400">: </span>
                      <span className="text-emerald-400">{"'sk-of_...'"}</span>
                      <span className="text-gray-400">,</span>
                    </div>
                    <div>
                      <span className="text-gray-300">{"  "}</span>
                      <span className="text-blue-300">routeId</span>
                      <span className="text-gray-400">: </span>
                      <span className="text-emerald-400">{"'support_chat'"}</span>
                      <span className="text-gray-400">,</span>
                    </div>
                    <div>
                      <span className="text-gray-300">{"})"}</span>
                    </div>
                    <div className="mt-4">
                      <span className="text-violet-400">const</span>
                      <span className="text-blue-300"> res</span>
                      <span className="text-gray-400"> = </span>
                      <span className="text-violet-400">await</span>
                      <span className="text-blue-300"> client</span>
                      <span className="text-gray-400">.</span>
                      <span className="text-blue-300">chat</span>
                      <span className="text-gray-400">.</span>
                      <span className="text-blue-300">completions</span>
                      <span className="text-gray-400">.</span>
                      <span className="text-amber-300">create</span>
                      <span className="text-gray-300">{"({"}</span>
                    </div>
                    <div>
                      <span className="text-gray-300">{"  "}</span>
                      <span className="text-blue-300">messages</span>
                      <span className="text-gray-400">: </span>
                      <span className="text-gray-300">{"[{ "}</span>
                      <span className="text-blue-300">role</span>
                      <span className="text-gray-400">: </span>
                      <span className="text-emerald-400">{"'user'"}</span>
                      <span className="text-gray-400">, </span>
                      <span className="text-blue-300">content</span>
                      <span className="text-gray-400">: </span>
                      <span className="text-emerald-400">{"'Hello!'"}</span>
                      <span className="text-gray-300">{" }]"}</span>
                      <span className="text-gray-400">,</span>
                    </div>
                    <div>
                      <span className="text-gray-300">{"})"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PRICING                                                      */}
      {/* ============================================================ */}
      <section id="pricing" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-3">
              Pricing
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Start free. Scale as you grow. Self-host for unlimited usage.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="reveal reveal-delay-1 rounded-2xl border border-gray-200 bg-white p-8 hover:shadow-lg transition-all duration-300">
              <h3 className="text-lg font-semibold text-gray-900">Free</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Perfect for getting started and small projects.
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  "10,000 requests/month",
                  "1 project",
                  "3 routes",
                  "Community support",
                  "Basic analytics",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="mt-8 block w-full text-center rounded-xl border-2 border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro - Highlighted */}
            <div className="reveal reveal-delay-2 relative rounded-2xl border-2 border-indigo-600 bg-white p-8 shadow-xl shadow-indigo-100">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white shadow-md">
                  Most Popular
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900">Pro</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-gray-900">$49</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                For growing teams that need more power.
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  "1,000,000 requests/month",
                  "Unlimited projects",
                  "Unlimited routes",
                  "Priority support",
                  "Advanced analytics",
                  "Custom model configs",
                  "Anomaly detection",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-indigo-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="mt-8 block w-full text-center rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                Start Pro Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="reveal reveal-delay-3 rounded-2xl border border-gray-200 bg-white p-8 hover:shadow-lg transition-all duration-300">
              <h3 className="text-lg font-semibold text-gray-900">Enterprise</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-gray-900">Custom</span>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                For organizations with advanced requirements.
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  "Unlimited everything",
                  "SSO / SAML",
                  "99.99% SLA",
                  "Dedicated support",
                  "Custom integrations",
                  "On-premise deployment",
                  "Audit logs",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <a
                href="mailto:sales@openfive.dev"
                className="mt-8 block w-full text-center rounded-xl border-2 border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  OPEN SOURCE CTA                                             */}
      {/* ============================================================ */}
      <section className="relative bg-gray-950 py-24 sm:py-32 overflow-hidden">
        {/* BG decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="reveal">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-sm text-gray-400 mb-8">
              <Star className="h-4 w-4 text-amber-400" />
              Star us on GitHub
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Open Source.
              <br />
              Self-hostable.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                No vendor lock-in.
              </span>
            </h2>

            <p className="mt-6 text-lg text-gray-400 max-w-lg mx-auto leading-relaxed">
              Deploy on your own infrastructure in minutes with Docker. Full
              control over your data, your models, and your costs.
            </p>

            {/* Code snippet */}
            <div className="mt-10 inline-flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-6 py-3 font-mono text-sm text-gray-300 shadow-lg">
              <span className="text-gray-500">$</span>
              <span>docker compose up -d</span>
              <button
                className="ml-4 text-gray-500 hover:text-gray-300 transition-colors"
                onClick={() =>
                  navigator.clipboard.writeText("docker compose up -d")
                }
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="https://github.com/openfive/openfive"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-gray-900 hover:bg-gray-100 transition-all shadow-lg hover:-translate-y-0.5"
              >
                <Github className="h-5 w-5" />
                View on GitHub
              </a>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/20 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/5 transition-all hover:-translate-y-0.5"
              >
                Try Cloud Free
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white font-bold text-sm">
                O5
              </div>
              <span className="text-lg font-semibold tracking-tight text-gray-900">
                OpenFive
              </span>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900 transition-colors">
                Documentation
              </a>
              <a
                href="https://github.com/openfive/openfive"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900 transition-colors"
              >
                GitHub
              </a>
              <a href="#pricing" className="hover:text-gray-900 transition-colors">
                Pricing
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                Blog
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                Status
              </a>
            </div>

            {/* Copyright */}
            <p className="text-sm text-gray-400">
              &copy; 2026 OpenFive. Open source under Apache 2.0.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
