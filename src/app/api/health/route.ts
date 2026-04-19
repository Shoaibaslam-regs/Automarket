import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ status: "MongoDB connected" });
  } catch (error) {
    return NextResponse.json({ status: "Connection failed", error }, { status: 500 });
  }
}