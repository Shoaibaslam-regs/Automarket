"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const features = [
    { icon: "🚗", title: "Buy & Sell", desc: "Find your perfect vehicle or list yours in minutes" },
    { icon: "🔑", title: "Rent Vehicles", desc: "Flexible short & long-term rentals across Pakistan" },
    { icon: "🤖", title: "AI Inspection", desc: "Upload photos — get instant damage reports & valuations" },
    { icon: "💬", title: "Direct Chat", desc: "Message sellers directly — no middlemen" },
    { icon: "🔒", title: "Secure Bookings", desc: "Verified listings and safe booking system" },
    { icon: "📍", title: "Pakistan-wide", desc: "Listings from every major city in Pakistan" },
  ];

  const stats = [
    { value: "10K+", label: "Active listings" },
    { value: "50K+", label: "Happy users" },
    { value: "100+", label: "Cities covered" },
    { value: "99%", label: "Satisfaction rate" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "white", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflow: "hidden" }}>

      {/* Animated background gradient */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(29,78,216,0.08), transparent 80%)`,
        pointerEvents: "none", transition: "background 0.1s"
      }} />

      {/* Grid pattern */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
        backgroundSize: "50px 50px",
        pointerEvents: "none",
      }} />

      {/* Navbar */}
      <nav style={{ position: "relative", zIndex: 10, padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Image src="/logo-1771205663069.png" alt="AutoMarket" width={130} height={36} style={{ width: "auto", height: "36px", filter: "brightness(0.5) invert(1)" }} />
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => router.push("/login")}
            style={{ padding: "8px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "rgba(255,255,255,0.7)", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}>
            Sign in
          </button>
          <button onClick={() => router.push("/register")}
            style={{ padding: "8px 20px", background: "white", border: "none", borderRadius: "8px", color: "#0d1117", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} style={{ position: "relative", zIndex: 1, padding: "80px 24px 60px", textAlign: "center", maxWidth: "900px", margin: "0 auto" }}>

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px", padding: "6px 14px", fontSize: "12px", color: "rgba(255,255,255,0.6)",
          marginBottom: "32px",
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.6s ease",
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2da44e", display: "inline-block" }} />
          Pakistan&apos;s #1 Automobile Marketplace
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: "clamp(40px, 7vw, 80px)", fontWeight: 800, lineHeight: 1.1,
          letterSpacing: "-2px", marginBottom: "24px",
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.7s ease 0.1s",
        }}>
          Buy, Sell &<br />
          <span style={{ background: "linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Rent Vehicles
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: "18px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7,
          maxWidth: "560px", margin: "0 auto 48px",
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.7s ease 0.2s",
        }}>
          Find your perfect car or bike across Pakistan. AI-powered inspection, secure bookings, and direct seller chat.
        </p>

        {/* CTA Button */}
        <div style={{
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.7s ease 0.3s",
        }}>
          <button
            onClick={() => router.push("/home")}
            style={{
              position: "relative", padding: "18px 48px",
              background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
              border: "none", borderRadius: "14px",
              color: "white", fontSize: "16px", fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(99,102,241,0.15)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.transform = "scale(1.04)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 0 60px rgba(99,102,241,0.6), 0 0 100px rgba(99,102,241,0.2)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.transform = "scale(1)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(99,102,241,0.15)";
            }}
          >
            Explore AutoMarket →
          </button>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "14px" }}>
            Free to browse • No account required
          </p>
        </div>

        {/* Floating car mockup */}
        <div style={{
          marginTop: "64px", position: "relative",
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.8s ease 0.4s",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px", padding: "24px", maxWidth: "680px", margin: "0 auto",
            backdropFilter: "blur(12px)",
          }}>
            {/* Mock UI */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {["#ff5f57", "#ffbd2e", "#28c840"].map(c => (
                <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {[
                { make: "Toyota", model: "Corolla 2022", price: "PKR 52L", color: "#60a5fa" },
                { make: "Honda", model: "Civic 2021", price: "PKR 48L", color: "#a78bfa" },
                { make: "Suzuki", model: "Swift 2023", price: "PKR 28L", color: "#34d399" },
              ].map(car => (
                <div key={car.make} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px" }}>
                  <div style={{ width: "100%", height: "60px", background: `linear-gradient(135deg, ${car.color}22, ${car.color}11)`, borderRadius: "6px", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                    🚗
                  </div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: "2px" }}>{car.make} {car.model}</p>
                  <p style={{ fontSize: "11px", color: car.color, fontWeight: 700 }}>{car.price}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Glow under mockup */}
          <div style={{ position: "absolute", bottom: "-20px", left: "50%", transform: "translateX(-50%)", width: "60%", height: "40px", background: "rgba(99,102,241,0.2)", filter: "blur(20px)", borderRadius: "50%" }} />
        </div>
      </section>

      {/* Stats */}
      <section style={{ position: "relative", zIndex: 1, padding: "48px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", textAlign: "center" }}>
          {stats.map((stat, i) => (
            <div key={stat.label} style={{
              opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
              transition: `all 0.6s ease ${0.5 + i * 0.1}s`,
            }}>
              <p style={{ fontSize: "32px", fontWeight: 800, background: "linear-gradient(135deg, white, rgba(255,255,255,0.6))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{stat.value}</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>Everything you need</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1px" }}>Built for Pakistan&apos;s<br />automobile market</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {features.map((f, i) => (
            <div key={f.title} style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px", padding: "24px",
              opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
              transition: `all 0.6s ease ${0.6 + i * 0.08}s`,
              cursor: "default",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
            >
              <div style={{ fontSize: "28px", marginBottom: "14px" }}>{f.icon}</div>
              <p style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>{f.title}</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: "16px" }}>
            Ready to find your<br />next vehicle?
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.45)", marginBottom: "36px" }}>
            Join thousands of buyers and sellers across Pakistan.
          </p>
          <button
            onClick={() => router.push("/sell")}
            style={{
              padding: "16px 40px", background: "white", border: "none", borderRadius: "12px",
              color: "#0d1117", fontSize: "15px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              transition: "transform 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            Browse listings →
          </button>
        </div>
      </section>

      {/* Footer */}
      <div style={{ position: "relative", zIndex: 1, padding: "24px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>© 2025 AutoMarket Pakistan. All rights reserved.</p>
      </div>
    </div>
  );
}
