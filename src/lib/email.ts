import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendBookingRequestEmail({
  ownerEmail,
  ownerName,
  renterName,
  renterEmail,
  renterPhone,
  listingTitle,
  startDate,
  endDate,
  totalAmount,
  deposit,
  days,
  bookingId,
}: {
  ownerEmail: string;
  ownerName: string;
  renterName: string;
  renterEmail: string;
  renterPhone?: string;
  listingTitle: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  deposit: number;
  days: number;
  bookingId: string;
}) {
  const bookingsUrl = `${process.env.NEXTAUTH_URL}/bookings`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: ownerEmail,
    subject: `New booking request for "${listingTitle}"`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f6f8fa; padding: 24px;">
        
        <div style="background: white; border-radius: 12px; border: 1px solid #e1e4e8; overflow: hidden;">
          
          <!-- Header -->
          <div style="background: #0d1117; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">AutoMarket</h1>
            <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 4px 0 0;">New booking request</p>
          </div>

          <!-- Body -->
          <div style="padding: 28px;">
            <p style="font-size: 15px; color: #0d1117; font-weight: 600; margin-bottom: 4px;">Hi ${ownerName},</p>
            <p style="font-size: 14px; color: #57606a; margin-bottom: 24px; line-height: 1.6;">
              You have received a new rental booking request for your listing <strong style="color: #0d1117;">${listingTitle}</strong>.
            </p>

            <!-- Booking details -->
            <div style="background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
              <p style="font-size: 12px; font-weight: 600; color: #0d1117; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Booking details</p>
              <table style="width: 100%; font-size: 13px;">
                <tr>
                  <td style="color: #57606a; padding: 4px 0;">Pick-up date</td>
                  <td style="color: #0d1117; font-weight: 600; text-align: right;">${new Date(startDate).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</td>
                </tr>
                <tr>
                  <td style="color: #57606a; padding: 4px 0;">Return date</td>
                  <td style="color: #0d1117; font-weight: 600; text-align: right;">${new Date(endDate).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</td>
                </tr>
                <tr>
                  <td style="color: #57606a; padding: 4px 0;">Duration</td>
                  <td style="color: #0d1117; font-weight: 600; text-align: right;">${days} day${days !== 1 ? "s" : ""}</td>
                </tr>
                <tr style="border-top: 1px solid #e1e4e8;">
                  <td style="color: #57606a; padding: 8px 0 4px;">Rental amount</td>
                  <td style="color: #0d1117; font-weight: 600; text-align: right; padding-top: 8px;">PKR ${totalAmount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #57606a; padding: 4px 0;">Security deposit</td>
                  <td style="color: #0d1117; font-weight: 600; text-align: right;">PKR ${deposit.toLocaleString()}</td>
                </tr>
                <tr style="border-top: 1px solid #e1e4e8;">
                  <td style="color: #0d1117; font-weight: 700; padding: 8px 0 4px;">Total payable</td>
                  <td style="color: #0d1117; font-weight: 700; text-align: right; padding-top: 8px;">PKR ${(totalAmount + deposit).toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <!-- Renter details -->
            <div style="background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 10px; padding: 18px; margin-bottom: 24px;">
              <p style="font-size: 12px; font-weight: 600; color: #0d1117; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Renter details</p>
              <table style="width: 100%; font-size: 13px;">
                <tr>
                  <td style="color: #57606a; padding: 4px 0;">Name</td>
                  <td style="color: #0d1117; font-weight: 600; text-align: right;">${renterName}</td>
                </tr>
                <tr>
                  <td style="color: #57606a; padding: 4px 0;">Email</td>
                  <td style="color: #0d1117; font-weight: 600; text-align: right;">${renterEmail}</td>
                </tr>
                ${renterPhone ? `
                <tr>
                  <td style="color: #57606a; padding: 4px 0;">Phone</td>
                  <td style="color: #0d1117; font-weight: 600; text-align: right;">${renterPhone}</td>
                </tr>` : ""}
              </table>
            </div>

            <!-- CTA -->
            <a href="${bookingsUrl}" style="display: block; text-align: center; padding: 12px; background: #0d1117; color: white; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; margin-bottom: 16px;">
              View &amp; respond to booking
            </a>

            <p style="font-size: 12px; color: #8c959f; text-align: center; line-height: 1.6;">
              Log in to AutoMarket to confirm or decline this request.<br/>
              The renter will be notified of your decision.
            </p>
          </div>
        </div>

        <p style="font-size: 11px; color: #8c959f; text-align: center; margin-top: 16px;">
          © 2025 AutoMarket Pakistan
        </p>
      </div>
    `,
  });
}

export async function sendBookingConfirmedEmail({
  renterEmail,
  renterName,
  listingTitle,
  startDate,
  endDate,
  ownerPhone,
  status,
}: {
  renterEmail: string;
  renterName: string;
  listingTitle: string;
  startDate: string;
  endDate: string;
  ownerPhone?: string;
  status: "CONFIRMED" | "CANCELLED";
}) {
  const isConfirmed = status === "CONFIRMED";

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: renterEmail,
    subject: `Booking ${isConfirmed ? "confirmed" : "declined"} — ${listingTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f6f8fa; padding: 24px;">
        <div style="background: white; border-radius: 12px; border: 1px solid #e1e4e8; overflow: hidden;">
          <div style="background: #0d1117; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">AutoMarket</h1>
            <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 4px 0 0;">Booking ${isConfirmed ? "confirmed" : "declined"}</p>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 15px; color: #0d1117; font-weight: 600; margin-bottom: 4px;">Hi ${renterName},</p>
            <p style="font-size: 14px; color: #57606a; margin-bottom: 24px; line-height: 1.6;">
              Your booking request for <strong style="color: #0d1117;">${listingTitle}</strong> has been 
              <strong style="color: ${isConfirmed ? "#1a7f37" : "#cf222e"};">${isConfirmed ? "confirmed" : "declined"}</strong> by the owner.
            </p>

            ${isConfirmed ? `
            <div style="background: #dafbe1; border: 1px solid #56d364; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
              <p style="font-size: 13px; color: #1a7f37; font-weight: 600; margin-bottom: 8px;">✅ Your booking is confirmed</p>
              <p style="font-size: 13px; color: #1a7f37; margin-bottom: 4px;">
                Pick-up: <strong>${new Date(startDate).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</strong>
              </p>
              <p style="font-size: 13px; color: #1a7f37; margin-bottom: 4px;">
                Return: <strong>${new Date(endDate).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</strong>
              </p>
              ${ownerPhone ? `<p style="font-size: 13px; color: #1a7f37; margin-top: 8px;">Owner contact: <strong>${ownerPhone}</strong></p>` : ""}
            </div>
            ` : `
            <div style="background: #fff0f0; border: 1px solid #ffcdd2; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
              <p style="font-size: 13px; color: #cf222e;">Unfortunately the owner has declined your request. You can browse other available vehicles.</p>
            </div>
            `}

            <a href="${process.env.NEXTAUTH_URL}/bookings" style="display: block; text-align: center; padding: 12px; background: #0d1117; color: white; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none;">
              View my bookings
            </a>
          </div>
        </div>
        <p style="font-size: 11px; color: #8c959f; text-align: center; margin-top: 16px;">© 2025 AutoMarket Pakistan</p>
      </div>
    `,
  });
}
