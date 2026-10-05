"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [windowWidth, setWindowWidth] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setWindowWidth(window.innerWidth);

    const handleMouse = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX,
        y: e.clientY,
      });
    };

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const isMobile = windowWidth > 0 && windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 900;

  const features = [
    {
      title: "Buy & Sell",
      desc: "Find your perfect vehicle or list yours in minutes.",
    },
    {
      title: "Rent Vehicles",
      desc: "Flexible short and long-term rentals across Pakistan.",
    },
    {
      title: "AI Inspection",
      desc: "Upload photos and get instant vehicle inspection insights.",
    },
    {
      title: "Direct Chat",
      desc: "Connect directly with sellers without unnecessary middlemen.",
    },
    {
      title: "Secure Bookings",
      desc: "A simple and reliable booking experience for vehicle rentals.",
    },
    {
      title: "Pakistan-wide",
      desc: "Discover listings from major cities across Pakistan.",
    },
  ];

  const stats = [
    { value: "10K+", label: "Active listings" },
    { value: "50K+", label: "Happy users" },
    { value: "100+", label: "Cities covered" },
    { value: "99%", label: "Satisfaction rate" },
  ];

  const howItWorks = [
    {
      number: "01",
      title: "Discover",
      desc: "Explore cars and bikes available for sale or rent across Pakistan.",
    },
    {
      number: "02",
      title: "Inspect",
      desc: "Review detailed vehicle information and AI-powered inspection insights.",
    },
    {
      number: "03",
      title: "Connect",
      desc: "Chat directly with sellers and move forward with confidence.",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d1117",
        color: "white",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Animated background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: `radial-gradient(
            600px circle at ${mousePos.x}px ${mousePos.y}px,
            rgba(29,78,216,0.08),
            transparent 80%
          )`,
          pointerEvents: "none",
          transition: "background 0.1s",
        }}
      />

      {/* Grid background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          opacity: 0.03,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          pointerEvents: "none",
        }}
      />

      {/* Navbar */}
      <nav
        style={{
          position: "relative",
          zIndex: 10,
          padding: isMobile ? "16px 18px" : "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <Image
            src="/logo-1771205663069.png"
            alt="AutoMarket"
            width={130}
            height={36}
            style={{
              width: "auto",
              height: isMobile ? "30px" : "36px",
              maxWidth: isMobile ? "105px" : "130px",
              filter: "brightness(0.5) invert(1)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: isMobile ? "7px" : "12px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => router.push("/login")}
            style={{
              padding: isMobile ? "7px 12px" : "8px 20px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              color: "rgba(255,255,255,0.7)",
              fontSize: isMobile ? "12px" : "14px",
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            Sign in
          </button>

          <button
            onClick={() => router.push("/register")}
            style={{
              padding: isMobile ? "7px 12px" : "8px 20px",
              background: "white",
              border: "none",
              borderRadius: "8px",
              color: "#0d1117",
              fontSize: isMobile ? "12px" : "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section
        ref={heroRef}
        style={{
          position: "relative",
          zIndex: 1,
          padding: isMobile
            ? "55px 18px 55px"
            : isTablet
            ? "70px 24px 60px"
            : "90px 24px 70px",
          textAlign: "center",
          maxWidth: "950px",
          margin: "0 auto",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "20px",
            padding: "7px 14px",
            fontSize: isMobile ? "10px" : "12px",
            color: "rgba(255,255,255,0.6)",
            marginBottom: isMobile ? "24px" : "32px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.6s ease",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#2da44e",
              display: "inline-block",
              flexShrink: 0,
            }}
          />

          Pakistan&apos;s #1 Automobile Marketplace
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: isMobile
              ? "42px"
              : isTablet
              ? "60px"
              : "clamp(48px, 7vw, 82px)",
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: isMobile ? "-1.5px" : "-2.5px",
            margin: 0,
            marginBottom: isMobile ? "20px" : "24px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s ease 0.1s",
          }}
        >
          Buy, Sell &<br />
          <span
            style={{
              background:
                "linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Rent Vehicles
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: isMobile ? "15px" : "18px",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.7,
            maxWidth: "570px",
            margin: isMobile ? "0 auto 34px" : "0 auto 48px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s ease 0.2s",
          }}
        >
          Find your perfect car or bike across Pakistan. AI-powered inspection,
          secure bookings, and direct seller chat.
        </p>

        {/* CTA */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s ease 0.3s",
          }}
        >
          <button
            onClick={() => router.push("/home")}
            style={{
              padding: isMobile ? "15px 28px" : "18px 48px",
              width: isMobile ? "100%" : "auto",
              maxWidth: isMobile ? "320px" : "none",
              background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
              border: "none",
              borderRadius: "14px",
              color: "white",
              fontSize: isMobile ? "14px" : "16px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow:
                "0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(99,102,241,0.15)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.04)";
              e.currentTarget.style.boxShadow =
                "0 0 60px rgba(99,102,241,0.6), 0 0 100px rgba(99,102,241,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow =
                "0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(99,102,241,0.15)";
            }}
          >
            Explore AutoMarket →
          </button>

          <p
            style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.3)",
              marginTop: "14px",
            }}
          >
            Free to browse • No account required
          </p>
        </div>

        {/* How AutoMarket Works */}
        <div
          style={{
            marginTop: isMobile ? "55px" : "75px",
            position: "relative",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.8s ease 0.4s",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              padding: isMobile ? "22px 16px" : "32px",
              maxWidth: "780px",
              margin: "0 auto",
              backdropFilter: "blur(14px)",
              boxShadow: "0 20px 80px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                textAlign: "left",
                marginBottom: isMobile ? "22px" : "28px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  color: "#60a5fa",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Simple & seamless
              </p>

              <h3
                style={{
                  fontSize: isMobile ? "22px" : "28px",
                  fontWeight: 700,
                  letterSpacing: "-0.6px",
                  margin: 0,
                }}
              >
                Your next vehicle starts here
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : isTablet
                  ? "1fr 1fr"
                  : "repeat(3, 1fr)",
                gap: "12px",
              }}
            >
              {howItWorks.map((step, index) => (
                <div
                  key={step.number}
                  style={{
                    position: "relative",
                    padding: isMobile ? "20px" : "22px",
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "14px",
                    textAlign: "left",
                    transition: "background 0.2s, border 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.045)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.025)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.06)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "22px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#60a5fa",
                        letterSpacing: "1px",
                      }}
                    >
                      {step.number}
                    </span>

                    <div
                      style={{
                        width: "28px",
                        height: "1px",
                        background: "rgba(255,255,255,0.15)",
                      }}
                    />
                  </div>

                  <h4
                    style={{
                      fontSize: "16px",
                      fontWeight: 650,
                      margin: "0 0 8px",
                    }}
                  >
                    {step.title}
                  </h4>

                  <p
                    style={{
                      fontSize: "12px",
                      lineHeight: 1.65,
                      color: "rgba(255,255,255,0.42)",
                      margin: 0,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: "-25px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "55%",
              height: "40px",
              background: "rgba(99,102,241,0.15)",
              filter: "blur(25px)",
              borderRadius: "50%",
              zIndex: -1,
            }}
          />
        </div>
      </section>

      {/* Stats */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          padding: isMobile ? "40px 18px" : "50px 24px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr 1fr"
              : isTablet
              ? "1fr 1fr"
              : "repeat(4, 1fr)",
            gap: isMobile ? "28px 12px" : "24px",
            textAlign: "center",
          }}
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(20px)",
                transition: `all 0.6s ease ${0.5 + i * 0.1}s`,
              }}
            >
              <p
                style={{
                  fontSize: isMobile ? "26px" : "32px",
                  fontWeight: 800,
                  margin: 0,
                  background:
                    "linear-gradient(135deg, white, rgba(255,255,255,0.6))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {stat.value}
              </p>

              <p
                style={{
                  fontSize: isMobile ? "11px" : "13px",
                  color: "rgba(255,255,255,0.4)",
                  marginTop: "4px",
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          padding: isMobile ? "65px 18px" : "90px 24px",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: isMobile ? "38px" : "56px",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#60a5fa",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "12px",
            }}
          >
            Everything you need
          </p>

          <h2
            style={{
              fontSize: isMobile ? "30px" : "clamp(28px, 4vw, 44px)",
              fontWeight: 800,
              letterSpacing: "-1px",
              margin: 0,
            }}
          >
            Built for Pakistan&apos;s
            <br />
            automobile market
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : isTablet
              ? "1fr 1fr"
              : "repeat(3, 1fr)",
            gap: isMobile ? "12px" : "16px",
          }}
        >
          {features.map((feature, i) => (
            <div
              key={feature.title}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "14px",
                padding: isMobile ? "20px" : "24px",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(20px)",
                transition: `all 0.6s ease ${0.6 + i * 0.08}s`,
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor =
                  "rgba(255,255,255,0.12)";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "rgba(255,255,255,0.02)";
                e.currentTarget.style.borderColor =
                  "rgba(255,255,255,0.07)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "4px",
                  borderRadius: "10px",
                  background:
                    "linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)",
                  marginBottom: "18px",
                  opacity: 0.8,
                }}
              />

              <p
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  margin: "0 0 8px",
                }}
              >
                {feature.title}
              </p>

              <p
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          padding: isMobile ? "65px 18px" : "90px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "560px",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontSize: isMobile ? "30px" : "clamp(28px, 4vw, 44px)",
              fontWeight: 800,
              letterSpacing: "-1px",
              margin: "0 0 16px",
            }}
          >
            Ready to find your
            <br />
            next vehicle?
          </h2>

          <p
            style={{
              fontSize: isMobile ? "14px" : "16px",
              color: "rgba(255,255,255,0.45)",
              marginBottom: "36px",
            }}
          >
            Join thousands of buyers and sellers across Pakistan.
          </p>

          <button
            onClick={() => router.push("/sell")}
            style={{
              padding: isMobile ? "14px 30px" : "16px 40px",
              width: isMobile ? "100%" : "auto",
              maxWidth: isMobile ? "320px" : "none",
              background: "white",
              border: "none",
              borderRadius: "12px",
              color: "#0d1117",
              fontSize: isMobile ? "14px" : "15px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            Browse listings →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          position: "relative",
          zIndex: 1,
          padding: "24px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.25)",
            margin: 0,
          }}
        >
          © 2025 AutoMarket Pakistan. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
