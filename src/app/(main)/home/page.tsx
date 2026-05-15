import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { IListing } from "@/models/Listing";
import Link from "next/link";
import Footer from "@/components/Footer";

type ListingWithId = IListing & { _id: string };

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"];
const MAKES = ["Toyota", "Honda", "Suzuki", "Yamaha", "Kawasaki", "BMW", "Hyundai", "Kia"];

async function getData() {
    await connectDB();
    const forSale = await Listing.find({ status: "ACTIVE", type: { $in: ["SALE", "BOTH"] } })
        .sort({ createdAt: -1 }).limit(6).lean() as unknown as ListingWithId[];
    const forRent = await Listing.find({ status: "ACTIVE", type: { $in: ["RENT", "BOTH"] } })
        .sort({ createdAt: -1 }).limit(4).lean() as unknown as ListingWithId[];
    const total = await Listing.countDocuments({ status: "ACTIVE" });
    const totalSale = await Listing.countDocuments({ status: "ACTIVE", type: { $in: ["SALE", "BOTH"] } });
    const totalRent = await Listing.countDocuments({ status: "ACTIVE", type: { $in: ["RENT", "BOTH"] } });
    return { forSale, forRent, stats: { total, totalSale, totalRent } };
}

export default async function HomePage() {
    const { forSale, forRent, stats } = await getData();

    return (
        <div style={{ position: "relative", minHeight: "100vh", background: "#f6f8fa" }}>

            <div style={{
                position: "fixed",
                inset: 0,
                zIndex: 0,
                opacity: 0.04,
                backgroundImage: "linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)",
                backgroundSize: "50px 50px",
                pointerEvents: "none",
            }} />

            {/* Your sections with zIndex:1 */}

            {/* Hero */}
            <section style={{ background: "#ffffff", borderBottom: "1px solid #e1e4e8", padding: "clamp(32px, 6vw, 64px) 24px" }}>
                <div style={{ maxWidth: "860px", margin: "0 auto", textAlign: "center" }}>
                    <div style={{ display: "inline-block", background: "#3434340f", color: "#57606a", fontSize: "12px", fontWeight: 500, padding: "8px 16px", borderRadius: "8px", marginBottom: "20px" }}>
                        Pakistan&apos;s trusted automobile marketplace
                    </div>
                    <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, color: "#0d1117", lineHeight: 1.2, marginBottom: "16px", letterSpacing: "-0.5px" }}>
                        Buy, Sell & Rent Vehicles
                    </h1>
                    <p style={{ fontSize: "clamp(15px, 2vw, 17px)", color: "#57606a", marginBottom: "36px", lineHeight: 1.6 }}>
                        Find your perfect car or bike. List yours in minutes. AI-powered inspection included.
                    </p>
                    <form action="/listings" method="GET" style={{ maxWidth: "600px", margin: "0 auto" }}>
                        <div style={{ display: "flex", background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                            <select name="type" style={{ padding: "14px 16px", border: "none", borderRight: "1px solid #d0d7de", background: "transparent", fontSize: "14px", color: "#57606a", cursor: "pointer", outline: "none" }}>
                                <option value="">All types</option>
                                <option value="SALE">For Sale</option>
                                <option value="RENT">For Rent</option>
                            </select>
                            <input name="search" type="text" placeholder="Search by make, model, or city..."
                                style={{ flex: 1, padding: "14px 16px", border: "none", background: "transparent", fontSize: "14px", color: "#0d1117", outline: "none", minWidth: 0 }} />
                            <button type="submit" style={{ padding: "14px 24px", background: "#0d1117", color: "white", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                                Search
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            {/* Stats bar */}
            <section style={{ background: "#ffffff", padding: "14px 24px", borderBottom: "1px solid #e1e4e8", overflowX: "auto" }}>
                <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", justifyContent: "center", alignItems: "center", gap: "clamp(16px, 3vw, 32px)", flexWrap: "wrap" }}>
                    {[
                        { label: "Active listings", value: stats.total },
                        { label: "For sale", value: stats.totalSale },
                        { label: "For rent", value: stats.totalRent },
                    ].map((s, i) => (
                        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "clamp(16px, 3vw, 32px)" }}>
                            {i > 0 && <div style={{ width: "1px", height: "20px", background: "#d0d7de" }} />}
                            <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: "20px", fontWeight: 700, color: "#0d1117" }}>{s.value.toLocaleString()}</div>
                                <div style={{ fontSize: "11px", color: "#57606a" }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                    <div style={{ width: "1px", height: "20px", background: "#d0d7de" }} />
                    <Link href="/sell" style={{ padding: "7px 16px", background: "#0d1117", color: "white", borderRadius: "7px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
                        + Post free ad
                    </Link>
                </div>
            </section>

            <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 16px" }}>

                {/* Browse by make */}
                <section style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
                    <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117", marginBottom: "14px" }}>Browse by make</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "10px" }}>
                        {MAKES.map(make => (
                            <Link key={make} href={`/listings?make=${make}`}
                                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "12px 8px", border: "1px solid #e1e4e8", borderRadius: "8px", textDecoration: "none", background: "#f6f8fa" }}>
                                <div style={{ width: "36px", height: "36px", background: "#0d1117", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "13px", fontWeight: 700 }}>
                                    {make[0]}
                                </div>
                                <span style={{ fontSize: "11px", color: "#57606a", fontWeight: 500 }}>{make}</span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Responsive two column */}
                {/* <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 300px)", gap: "20px" }}> */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                        gap: "20px",
                        // alignItems: "start",
                    }}
                >

                    {/* Main */}
                    <div style={{ minWidth: 0 }}>
                        <section style={{ marginBottom: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                                <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117" }}>Latest for sale</h2>
                                <Link href="/listings?type=SALE" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>View all →</Link>
                            </div>
                            {forSale.length === 0 ? (
                                <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#57606a", fontSize: "14px" }}>
                                    No listings yet — <Link href="/sell" style={{ color: "#0d1117", fontWeight: 600 }}>be the first to post</Link>
                                </div>
                            ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" }}>
                                    {forSale.map(listing => (
                                        <Link key={listing._id} href={`/listings/${listing._id}`} style={{ textDecoration: "none" }}>
                                            <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "10px", overflow: "hidden", height: "100%" }}>
                                                <div style={{ height: "140px", background: "#f6f8fa", overflow: "hidden", position: "relative" }}>
                                                    {listing.images?.[0] ? (
                                                        <img src={listing.images[0]} alt={listing.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    ) : (
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#8c959f", fontSize: "12px" }}>No image</div>
                                                    )}
                                                    <div style={{ position: "absolute", top: "8px", left: "8px", background: listing.type === "RENT" ? "#2da44e" : "#0d1117", color: "white", fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "20px" }}>
                                                        {listing.type === "SALE" ? "For Sale" : listing.type === "RENT" ? "For Rent" : "Sale & Rent"}
                                                    </div>
                                                </div>
                                                <div style={{ padding: "12px" }}>
                                                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.title}</p>
                                                    <p style={{ fontSize: "11px", color: "#57606a", marginBottom: "8px" }}>{listing.make} {listing.model} · {listing.year}</p>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#0d1117" }}>PKR {listing.price.toLocaleString()}</span>
                                                        <span style={{ fontSize: "11px", color: "#8c959f" }}>{listing.location}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* How it works */}
                        <section style={{ marginBottom: "20px" }}>
                            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117", marginBottom: "14px" }}>
                                How it works
                            </h2>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                    gap: "14px",
                                }}
                            >
                                {[
                                    {
                                        n: "01",
                                        title: "Post your ad",
                                        desc: "Fill in vehicle details, upload photos and set your price in 3 minutes.",
                                    },
                                    {
                                        n: "02",
                                        title: "Get contacted",
                                        desc: "Buyers reach you directly via call or WhatsApp — no middleman.",
                                    },
                                    {
                                        n: "03",
                                        title: "Close the deal",
                                        desc: "Meet, inspect with AI, and complete the transaction safely.",
                                    },
                                ].map((step) => (
                                    <div
                                        key={step.n}
                                        style={{
                                            background: "white",
                                            border: "1px solid #e1e4e8",
                                            borderRadius: "12px",
                                            padding: "18px",
                                            position: "relative",
                                            transition: "0.2s",
                                        }}
                                    >
                                        {/* Step badge */}
                                        <div
                                            style={{
                                                width: "38px",
                                                height: "38px",
                                                borderRadius: "10px",
                                                background: "#0d1117",
                                                color: "white",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                marginBottom: "12px",
                                            }}
                                        >
                                            {step.n}
                                        </div>

                                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>
                                            {step.title}
                                        </p>

                                        <p style={{ fontSize: "12px", color: "#57606a", lineHeight: 1.6 }}>
                                            {step.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
                        <section>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117" }}>For rent</h2>
                                <Link href="/listings?type=RENT" style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>View all →</Link>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {forRent.length === 0 ? (
                                    <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "10px", padding: "20px", textAlign: "center", color: "#57606a", fontSize: "12px" }}>No rentals yet</div>
                                ) : forRent.map(listing => (
                                    <Link key={listing._id} href={`/listings/${listing._id}`} style={{ textDecoration: "none" }}>
                                        <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "10px", padding: "10px", display: "flex", gap: "10px" }}>
                                            <div style={{ width: "64px", height: "48px", borderRadius: "6px", background: "#f6f8fa", flexShrink: 0, overflow: "hidden" }}>
                                                {listing.images?.[0] ? (
                                                    <img src={listing.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                ) : (
                                                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8c959f", fontSize: "10px" }}>No img</div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: "12px", fontWeight: 600, color: "#0d1117", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "2px" }}>{listing.title}</p>
                                                <p style={{ fontSize: "11px", color: "#57606a", marginBottom: "3px" }}>{listing.make} · {listing.year}</p>
                                                <p style={{ fontSize: "12px", fontWeight: 700, color: "#2da44e" }}>PKR {listing.price.toLocaleString()}/day</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>

                        <section style={{ background: "#0d1117", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
                            <p style={{ fontSize: "14px", fontWeight: 600, color: "white", marginBottom: "6px" }}>Sell your vehicle</p>
                            <p style={{ fontSize: "12px", color: "#8c959f", marginBottom: "16px", lineHeight: 1.5 }}>Post a free ad and reach thousands of buyers today</p>
                            <Link href="/sell" style={{ display: "block", padding: "10px", background: "white", color: "#0d1117", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
                                Post free ad
                            </Link>
                        </section>

                        <section style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
                            <div style={{ width: "40px", height: "40px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "20px" }}>🔍</div>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>AI vehicle inspection</p>
                            <p style={{ fontSize: "12px", color: "#57606a", marginBottom: "16px", lineHeight: 1.5 }}>Upload photos — get instant damage reports & value estimates</p>
                            <Link href="/sell" style={{ display: "block", padding: "10px", background: "#f6f8fa", border: "1px solid #d0d7de", color: "#0d1117", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
                                Try AI inspection
                            </Link>
                        </section>

                        <section style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "16px 20px" }}>
                            <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "10px" }}>Browse by city</h2>
                            {CITIES.map(city => (
                                <Link key={city} href={`/listings?location=${city}`}
                                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 8px", borderRadius: "6px", textDecoration: "none", color: "#57606a", fontSize: "13px" }}>
                                    <span>{city}</span>
                                    <span style={{ fontSize: "11px" }}>→</span>
                                </Link>
                            ))}
                        </section>
                    </div>
                </div>
            </div>
<Footer/>
      </div>
    );
}
