import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { role } = await req.json();
    await connectDB();
    const employee = await Employee.findByIdAndUpdate(id, { role }, { new: true });
    if (employee) await User.findByIdAndUpdate(employee.userId, { organizationRole: role });
    return NextResponse.json({ employee });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const employee = await Employee.findByIdAndDelete(id);
    if (employee) {
      await User.findByIdAndUpdate(employee.userId, {
        $unset: { organizationId: "", organizationRole: "" }
      });
    }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
