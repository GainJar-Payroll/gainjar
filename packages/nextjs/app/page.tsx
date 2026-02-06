"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "~~/components/ui/button";

export default function GainJarLanding() {
  const [streamAmount, setStreamAmount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setStreamAmount(prev => prev + 0.0289);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Hero Section */}
      <section className="min-h-[80vh] flex items-center px-6 lg:px-12 py-20 border-b border-border">
        <div className="max-w-5xl mx-auto w-full">
          <div
            className={`max-w-4xl transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8 font-medium">
              Established 2025
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-heading font-bold tracking-tight mb-10 leading-[0.9] max-w-5xl">
              GAINJAR
            </h1>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading mb-12 leading-tight max-w-3xl">
              A decentralized payroll protocol enabling continuous, real-time salary payments on the blockchain.
            </h2>

            <div className="border-l-4 border-foreground pl-6 mb-12 max-w-2xl">
              <p className="text-lg text-muted-foreground leading-relaxed">
                GainJar replaces informal payroll agreements with cryptographic verification. Salaries stream every
                second. Withdraw anytime. Fully on-chain.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Link href="/dashboard">
                <Button size="lg" className="uppercase tracking-wider font-medium">
                  Launch Application
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="uppercase tracking-wider font-medium">
                  Read Documentation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Earnings Display */}
      <section className="py-20 px-6 lg:px-12 border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 font-medium">
                Live Demonstration
              </div>
              <h3 className="text-4xl font-heading font-bold mb-6">Your earnings stream in real-time.</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Stop waiting for payday. With GainJar, your compensation accrues continuously every second you work.
                Withdraw instantly, anytime you need funds.
              </p>
            </div>
            <div className="border-2 border-foreground p-12 text-center bg-background">
              <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-4 font-medium">
                Streaming Now
              </div>
              <div className="text-6xl font-heading font-bold tabular-nums mb-3">${streamAmount.toFixed(4)}</div>
              <div className="text-sm text-muted-foreground font-mono">+$0.0289/second • $2,500/month</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 lg:px-12 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
            {[
              { value: "$2.4M+", label: "Streamed to Date" },
              { value: "847", label: "Active Streams" },
              { value: "99.9%", label: "Uptime" },
              { value: "<1s", label: "Withdrawal Time" },
            ].map((stat, idx) => (
              <div key={idx}>
                <div className="text-4xl sm:text-5xl font-heading font-bold mb-3 tabular-nums">{stat.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-24 px-6 lg:px-12 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6 font-medium">
                The Administrative Gap
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold mb-8 leading-tight">
                Informal payroll lacks accountability.
              </h2>
            </div>

            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xl mb-2">Undocumented Approvals</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Traditional payroll relies on ephemeral chat messages or verbal agreements. These records are
                    difficult to audit and easy to dispute.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xl mb-2">Drift & Amnesia</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Without a rigid ledger, organizations lose track of who authorized what. Historical context erodes,
                    leading to financial inefficiency.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xl mb-2">Payment Delays</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Employees wait weeks for payday. Manual transfers introduce delays, errors, and reconciliation
                    headaches. Liquidity is locked.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution - The Mechanism */}
      <section className="py-24 px-6 lg:px-12 border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6 font-medium">
              The Mechanism
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold mb-8 max-w-3xl leading-tight">
              Record decisions on-chain.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
              GainJar utilizes blockchain technology strictly as a permanent, append-only database. Every salary stream
              and withdrawal is cryptographically signed and timestamped.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="w-12 h-12 mb-6 flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h4 className="font-heading font-bold text-xl mb-3">Immutability</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Once a salary stream is recorded, it cannot be altered or deleted. The history of the organization is
                preserved exactly as it occurred.
              </p>
            </div>

            <div>
              <div className="w-12 h-12 mb-6 flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className="font-heading font-bold text-xl mb-3">Verifiable Timestamps</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Every action is time-bound to the block it was included in. This creates an indisputable timeline of
                events for audits.
              </p>
            </div>

            <div>
              <div className="w-12 h-12 mb-6 flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
              <h4 className="font-heading font-bold text-xl mb-3">Cryptographic Signatures</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Approvals are signed by private keys held by authorized personnel. Identity is mathematical, not just a
                username.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features - How It Works */}
      <section id="how-it-works" className="py-24 px-6 lg:px-12 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-20">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6 font-medium">Process</div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold mb-8 leading-tight max-w-3xl">
              Four steps to continuous payroll.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-x-16 gap-y-16">
            {[
              {
                step: "01",
                title: "Connect Wallet",
                desc: "Link your Web3 wallet. No passwords, no accounts. Just blockchain-native access.",
              },
              {
                step: "02",
                title: "Create Stream",
                desc: "Set recipient address, salary rate, and duration. Approve the transaction on-chain with your signature.",
              },
              {
                step: "03",
                title: "Fund Vault",
                desc: "Deposit USDC into your employer vault. Payments flow automatically and continuously from your reserves.",
              },
              {
                step: "04",
                title: "Withdraw Anytime",
                desc: "Employees claim earnings instantly. Direct settlement to personal wallet with no intermediaries.",
              },
            ].map((item, idx) => (
              <div key={idx} className="border-l-4 border-foreground pl-8">
                <div className="text-sm font-mono text-muted-foreground mb-3">{item.step}</div>
                <h3 className="text-2xl font-heading font-bold mb-4">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stream Types */}
      <section id="features" className="py-24 px-6 lg:px-12 border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6 font-medium">
              Stream Types
            </div>
            <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-8 leading-tight max-w-3xl">
              Flexible payment structures for every use case.
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="border-2 border-foreground p-10 bg-background">
              <div className="mb-8">
                <h3 className="text-3xl font-heading font-bold mb-4">Infinite Stream</h3>
                <p className="text-muted-foreground leading-relaxed">
                  For ongoing full-time employment with no predetermined end date. Salary streams continuously until
                  manually paused.
                </p>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-foreground rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium">No end time</span> — Streams indefinitely
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-foreground rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium">Flexible rates</span> — Hourly, daily, or monthly
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-foreground rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium">Updatable</span> — Adjust rate with new transaction
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-border">
                <div className="font-mono text-xs text-muted-foreground">createMonthlyStream(employee, 5000e6)</div>
              </div>
            </div>

            <div className="border-2 border-foreground p-10 bg-background">
              <div className="mb-8">
                <h3 className="text-3xl font-heading font-bold mb-4">Finite Stream</h3>
                <p className="text-muted-foreground leading-relaxed">
                  For project-based contracts with fixed duration and total amount. Automatically ends when fully
                  withdrawn or time expires.
                </p>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-foreground rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium">Fixed duration</span> — Predetermined end time
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-foreground rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium">Total amount</span> — Contract value set upfront
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-foreground rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium">Extendable</span> — Can be prolonged if needed
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-border">
                <div className="font-mono text-xs text-muted-foreground">
                  createFiniteStreamDays(employee, 6000e6, 30)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vault Health System */}
      <section className="py-24 px-6 lg:px-12 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6 font-medium">
                Protection System
              </div>
              <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-8 leading-tight">
                Vault health monitoring & liquidation protection.
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                GainJar monitors employer vaults and classifies them into health statuses. When funds run critically
                low, automatic liquidation ensures employees get paid first.
              </p>
              <div className="border-l-4 border-foreground pl-6">
                <p className="text-muted-foreground leading-relaxed">
                  All employers must maintain at least 7 days of coverage. System alerts at warning thresholds and
                  executes automatic employee protection if vault reaches critical levels.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-l-4 border-foreground pl-6 py-4">
                <div className="flex items-baseline gap-4 mb-2">
                  <div className="text-2xl font-heading font-bold">HEALTHY</div>
                  <div className="text-sm font-mono text-muted-foreground">≥30 days</div>
                </div>
                <p className="text-sm text-muted-foreground">Vault well-funded. Normal operations.</p>
              </div>

              <div className="border-l-4 border-muted-foreground/40 pl-6 py-4">
                <div className="flex items-baseline gap-4 mb-2">
                  <div className="text-2xl font-heading font-bold text-muted-foreground">WARNING</div>
                  <div className="text-sm font-mono text-muted-foreground">7-29 days</div>
                </div>
                <p className="text-sm text-muted-foreground">Vault needs attention. Employer should deposit.</p>
              </div>

              <div className="border-l-4 border-muted-foreground/30 pl-6 py-4">
                <div className="flex items-baseline gap-4 mb-2">
                  <div className="text-2xl font-heading font-bold text-muted-foreground/70">CRITICAL</div>
                  <div className="text-sm font-mono text-muted-foreground">3-6 days</div>
                </div>
                <p className="text-sm text-muted-foreground">Vault running low. Liquidation eligible.</p>
              </div>

              <div className="border-l-4 border-muted-foreground/20 pl-6 py-4">
                <div className="flex items-baseline gap-4 mb-2">
                  <div className="text-2xl font-heading font-bold text-muted-foreground/50">EMERGENCY</div>
                  <div className="text-sm font-mono text-muted-foreground">&lt;3 days</div>
                </div>
                <p className="text-sm text-muted-foreground">Vault critically low. Auto-liquidation imminent.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-24 px-6 lg:px-12 border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6 font-medium">
              Security & Trust
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold mb-8 leading-tight max-w-3xl">
              Built on cryptographic verification.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <h3 className="text-2xl font-heading font-bold mb-6">Smart Contract Security</h3>
              <div className="space-y-6">
                <div className="border-l-2 border-border pl-6">
                  <div className="font-medium mb-2">Audited Contracts</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Code reviewed by security experts. All logic verifiable on-chain. No backdoors, no exploits.
                  </p>
                </div>
                <div className="border-l-2 border-border pl-6">
                  <div className="font-medium mb-2">ReentrancyGuard</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Industry-standard protection against reentrancy attacks on all withdrawal functions.
                  </p>
                </div>
                <div className="border-l-2 border-border pl-6">
                  <div className="font-medium mb-2">Access Control</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    OpenZeppelin Ownable pattern with strict permission management for administrative functions.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-heading font-bold mb-6">Self-Custody & Transparency</h3>
              <div className="space-y-6">
                <div className="border-l-2 border-border pl-6">
                  <div className="font-medium mb-2">Non-Custodial</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You hold your own keys. You control your funds. We never custody your money. Pure DeFi.
                  </p>
                </div>
                <div className="border-l-2 border-border pl-6">
                  <div className="font-medium mb-2">On-Chain Records</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Every transaction recorded immutably on Arbitrum. Full auditability. No hidden fees.
                  </p>
                </div>
                <div className="border-l-2 border-border pl-6">
                  <div className="font-medium mb-2">Open Source</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    All smart contract code publicly available on GitHub. Verify before you trust.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-6 lg:px-12 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6 font-medium">Use Cases</div>
            <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-8 leading-tight max-w-3xl">
              Who uses GainJar?
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              {
                title: "Full-Time Developers",
                desc: "Monthly salary streaming with continuous accrual",
                example: "$8,000/month = $0.092/second",
              },
              {
                title: "Freelance Designers",
                desc: "Project-based contracts with fixed duration",
                example: "$5,000 over 30 days with auto-end",
              },
              {
                title: "DAO Contributors",
                desc: "Decentralized payroll for distributed teams",
                example: "Multi-sig controlled streams",
              },
              {
                title: "Global Remote Teams",
                desc: "Borderless payments in stablecoins",
                example: "USDC to 100+ countries instantly",
              },
            ].map((useCase, idx) => (
              <div key={idx}>
                <h4 className="font-heading font-bold text-lg mb-3">{useCase.title}</h4>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{useCase.desc}</p>
                <div className="text-xs font-mono text-muted-foreground">{useCase.example}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fee Structure */}
      <section className="py-24 px-6 lg:px-12 border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6 font-medium">Pricing</div>
              <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-8 leading-tight">
                Transparent fee structure.
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                GainJar charges a minimal 0.05% fee on employee withdrawals. No monthly fees, no setup fees, no hidden
                charges. Just simple, transparent pricing.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-5xl font-heading font-bold mb-3 tabular-nums">0.05%</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Withdrawal Fee</div>
                <div className="text-xs text-muted-foreground mt-3 font-mono">$1,000 → $0.50 fee</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-heading font-bold mb-3">$0</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Stream Creation</div>
                <div className="text-xs text-muted-foreground mt-3 font-mono">Only gas fees</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-heading font-bold mb-3">$0</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Vault Deposits</div>
                <div className="text-xs text-muted-foreground mt-3 font-mono">No charges</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="py-24 px-6 lg:px-12 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6 font-medium">
                Technology
              </div>
              <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-8 leading-tight">
                Why a blockchain ledger?
              </h2>
            </div>

            <div className="space-y-8">
              <div>
                <h4 className="font-heading font-bold text-xl mb-4">Distributed tamper-evident database</h4>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  We use blockchain solely for its properties as a distributed, tamper-evident database. This ensures
                  the financial record remains the single source of truth.
                </p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-xl mb-4">Removes super-user risk</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Traditional databases rely on a single administrator who can modify records. A blockchain ledger
                  removes the "super-user" risk, ensuring that the financial record remains the single source of truth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold mb-8 leading-tight">
            Ready to transform your payroll?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            Join employers and employees already using GainJar for transparent, instant, decentralized payments.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/dashboard">
              <Button size="lg" className="px-10 uppercase tracking-wider font-medium">
                Launch Application
              </Button>
            </Link>
            <Link href="https://github.com/raihanmd/gainjar" target="_blank">
              <Button size="lg" variant="outline" className="px-10 uppercase tracking-wider font-medium">
                View on GitHub
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-xs uppercase tracking-wider text-muted-foreground">
            <div>Audited Contracts</div>
            <div>•</div>
            <div>Non-Custodial</div>
            <div>•</div>
            <div>Open Source</div>
            <div>•</div>
            <div>0.05% Fee</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="text-2xl font-heading font-bold mb-4 lowercase">gainjar</div>
              <p className="text-sm text-muted-foreground">Decentralized payroll streaming protocol</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider mb-4 font-medium">Product</div>
              <div className="space-y-3 text-sm">
                <div>
                  <Link href="/dashboard" className="hover:opacity-60 transition-opacity">
                    Dashboard
                  </Link>
                </div>
                <div>
                  <Link href="#features" className="hover:opacity-60 transition-opacity">
                    Features
                  </Link>
                </div>
                <div>
                  <Link href="#how-it-works" className="hover:opacity-60 transition-opacity">
                    Documentation
                  </Link>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider mb-4 font-medium">Developers</div>
              <div className="space-y-3 text-sm">
                <div>
                  <a
                    href="https://github.com/raihanmd/gainjar"
                    target="_blank"
                    className="hover:opacity-60 transition-opacity"
                  >
                    GitHub
                  </a>
                </div>
                <div>
                  <Link href="/docs/api" className="hover:opacity-60 transition-opacity">
                    API Reference
                  </Link>
                </div>
                <div>
                  <Link href="/docs/security" className="hover:opacity-60 transition-opacity">
                    Security
                  </Link>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider mb-4 font-medium">Social</div>
              <div className="space-y-3 text-sm">
                <div>
                  <a
                    href="https://twitter.com/raihanmddd"
                    target="_blank"
                    className="hover:opacity-60 transition-opacity"
                  >
                    Twitter
                  </a>
                </div>
                <div>
                  <a
                    href="https://github.com/raihanmd/gainjar/discussions"
                    target="_blank"
                    className="hover:opacity-60 transition-opacity"
                  >
                    Discussions
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-xs text-muted-foreground">
            <p className="mb-2">© 2026 GainJar Protocol. MIT License. Built by @raihanmd</p>
            <p>⚠️ Experimental software. Use at your own risk. Always test before production.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
