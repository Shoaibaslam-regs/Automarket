import nodemailer from "nodemailer";

// Gmail only allows about 500 emails a day. For real traffic, set SMTP_HOST (and SMTP_PORT, default 587) to a
// transactional email service such as Amazon SES, Brevo or Resend; EMAIL_USER/EMAIL_PASS are then its SMTP login.
// Google shows app passwords in groups of four ("abcd efgh ijkl mnop"); spaces are never part of them
const auth = { user: process.env.EMAIL_USER, pass: (process.env.EMAIL_PASS ?? "").replace(/\s+/g, "") };
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: smtpPort, secure: smtpPort === 465, pool: true, auth })
  : nodemailer.createTransport({ service: "gmail", auth });

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
            <h1 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">AutoGO</h1>
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
              Log in to AutoGO to confirm or decline this request.<br/>
              The renter will be notified of your decision.
            </p>
          </div>
        </div>

        <p style="font-size: 11px; color: #8c959f; text-align: center; margin-top: 16px;">
          © 2025 AutoGO Pakistan
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
            <h1 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">AutoGO</h1>
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
              <p style="font-size: 13px; color: #1a7f37; font-weight: 600; margin-bottom: 8px;">Your booking is confirmed</p>
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
        <p style="font-size: 11px; color: #8c959f; text-align: center; margin-top: 16px;">© 2025 AutoGO Pakistan</p>
      </div>
    `,
  });
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendSavedSearchAlertEmail({
  to,
  name,
  searchNames,
  listing,
}: {
  to: string;
  name?: string;
  searchNames: string[];
  listing: { id: string; title: string; price: string; details: string; location: string; image?: string };
}) {
  const listingUrl = `${process.env.NEXTAUTH_URL}/listings/${listing.id}`;
  const manageUrl = `${process.env.NEXTAUTH_URL}/saved`;
  const searches = searchNames.map(n => `<strong style="color: #0d1117;">${escapeHtml(n)}</strong>`).join(", ");

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `New match: ${listing.title} — ${listing.price}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f6f8fa; padding: 24px;">
        <div style="background: white; border-radius: 12px; border: 1px solid #e1e4e8; overflow: hidden;">
          <div style="background: #0d1117; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">AutoGO</h1>
            <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 4px 0 0;">A new vehicle matches your saved search</p>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 15px; color: #0d1117; font-weight: 600; margin-bottom: 4px;">Hi ${escapeHtml(name || "there")},</p>
            <p style="font-size: 14px; color: #57606a; margin-bottom: 24px; line-height: 1.6;">
              A vehicle matching ${searches} was just listed. Good deals go fast, so take a look.
            </p>
            <a href="${listingUrl}" style="display: block; text-decoration: none; background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
              ${listing.image ? `<img src="${escapeHtml(listing.image)}" alt="" width="544" style="display: block; width: 100%; height: auto; max-height: 300px; object-fit: cover;" />` : ""}
              <div style="padding: 16px 18px;">
                <p style="font-size: 12px; color: #57606a; margin: 0 0 4px;">${escapeHtml(listing.details)}</p>
                <p style="font-size: 16px; color: #0d1117; font-weight: 700; margin: 0 0 6px;">${escapeHtml(listing.title)}</p>
                <p style="font-size: 15px; color: #0d1117; font-weight: 700; margin: 0;">${escapeHtml(listing.price)}
                  <span style="font-size: 12px; color: #57606a; font-weight: 400;"> · ${escapeHtml(listing.location)}</span></p>
              </div>
            </a>
            <a href="${listingUrl}" style="display: block; text-align: center; padding: 12px; background: #0d1117; color: white; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; margin-bottom: 16px;">
              View listing
            </a>
            <p style="font-size: 12px; color: #8c959f; text-align: center; line-height: 1.6;">
              You're receiving this because you turned on alerts for a saved search.<br/>
              <a href="${manageUrl}" style="color: #57606a;">Manage your saved searches</a>
            </p>
          </div>
        </div>
        <p style="font-size: 11px; color: #8c959f; text-align: center; margin-top: 16px;">© ${new Date().getFullYear()} AutoGO Pakistan</p>
      </div>
    `,
  });
}

/** Forgot-password email with a one-time link (valid for an hour). */
export async function sendPasswordResetEmail({ to, name, link }: { to: string; name?: string; link: string }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Reset your AutoGO password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f6f8fa; padding: 24px;">
        <div style="background: white; border-radius: 12px; border: 1px solid #e1e4e8; overflow: hidden;">
          <div style="background: #0d1117; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">AutoGO</h1>
            <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 4px 0 0;">Password reset</p>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 15px; color: #0d1117; font-weight: 600; margin-bottom: 4px;">Hi ${name ? escapeHtml(name) : "there"},</p>
            <p style="font-size: 14px; color: #57606a; margin-bottom: 24px; line-height: 1.6;">
              Someone asked to reset the password for your AutoGO account. Click the button to choose a new one.
              The link works once and expires in 1 hour.
            </p>
            <a href="${link}" style="display: block; text-align: center; padding: 12px; background: #0d1117; color: white; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none;">
              Choose a new password
            </a>
            <p style="font-size: 12px; color: #8c959f; margin-top: 20px; line-height: 1.6;">
              If you didn't ask for this, ignore this email. Your password stays the same.
            </p>
          </div>
        </div>
      </div>
    `,
  });
}

function simpleEmail({ to, subject, kicker, name, body, button }: { to: string; subject: string; kicker: string; name?: string; body: string; button?: { href: string; label: string } }) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f6f8fa; padding: 24px;">
        <div style="background: white; border-radius: 12px; border: 1px solid #e1e4e8; overflow: hidden;">
          <div style="background: #0d1117; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">AutoGO</h1>
            <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 4px 0 0;">${kicker}</p>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 15px; color: #0d1117; font-weight: 600; margin-bottom: 4px;">Hi ${name ? escapeHtml(name) : "there"},</p>
            <p style="font-size: 14px; color: #57606a; margin-bottom: 24px; line-height: 1.6;">${body}</p>
            ${button ? `<a href="${button.href}" style="display: block; text-align: center; padding: 12px; background: #0d1117; color: white; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none;">${button.label}</a>` : ""}
            <p style="font-size: 12px; color: #8c959f; margin-top: 20px; line-height: 1.6;">If this wasn't you, ignore this email. Nothing changes on your account.</p>
          </div>
        </div>
      </div>
    `,
  });
}

/** The 6-digit code that confirms a new account (typed on the sign-up or sign-in page). */
export async function sendSignupCodeEmail({ to, name, code, minutes }: { to: string; name?: string; code: string; minutes: number }) {
  await simpleEmail({
    to, name, subject: `${code} is your AutoGO code`, kicker: "Confirm your account",
    body: `Welcome to AutoGO! Enter this code to finish creating your account:<br><br><span style="display:inline-block;font-size:28px;font-weight:700;letter-spacing:6px;color:#0d1117;background:#f6f8fa;border:1px solid #e1e4e8;border-radius:8px;padding:10px 16px">${code}</span><br><br>It works for ${minutes} minutes. Never share it with anyone, AutoGO will never ask you for it.`,
  });
}

/**
 * Sent instead of a confirmation when someone signs up with an email that already has an account, so the sign-up
 * page can answer the same way for both and doesn't reveal which emails are registered.
 */
export async function sendAccountExistsEmail({ to, name, loginLink, resetLink }: { to: string; name?: string; loginLink: string; resetLink: string }) {
  await simpleEmail({
    to, name, subject: "You already have an AutoGO account", kicker: "Sign-up attempt",
    body: `Someone (hopefully you) tried to create an AutoGO account with this email, but you already have one. <a href="${loginLink}">Sign in here</a>, or if you've forgotten your password, <a href="${resetLink}">reset it</a>.`,
    button: { href: loginLink, label: "Sign in" },
  });
}

/** "Your plan ends in N days" reminder, sent once per plan period by the daily cron. */
export async function sendPlanExpiringEmail({ to, name, planName, endsAt, daysLeft }: { to: string; name?: string; planName: string; endsAt: Date; daysLeft: number }) {
  const when = endsAt.toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Karachi" });
  const left = daysLeft <= 1 ? "tomorrow" : `in ${daysLeft} days`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Your AutoGO ${planName} plan ends ${left}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f6f8fa; padding: 24px;">
        <div style="background: white; border-radius: 12px; border: 1px solid #e1e4e8; overflow: hidden;">
          <div style="background: #0d1117; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">AutoGO</h1>
            <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 4px 0 0;">Plan reminder</p>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 15px; color: #0d1117; font-weight: 600; margin-bottom: 4px;">Hi ${escapeHtml(name || "there")},</p>
            <p style="font-size: 14px; color: #57606a; margin-bottom: 24px; line-height: 1.6;">
              Your <strong style="color: #0d1117;">${escapeHtml(planName)}</strong> plan ends ${left}, on ${when}.
              After that your account moves to the Free plan and its limits. Your listings and records stay, but you
              can't add more than the Free plan allows. Renew before then to keep everything running.
            </p>
            <a href="${process.env.NEXTAUTH_URL}/pricing" style="display: block; text-align: center; padding: 12px; background: #0d1117; color: white; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none;">
              Renew my plan
            </a>
          </div>
        </div>
        <p style="font-size: 11px; color: #8c959f; text-align: center; margin-top: 16px;">© ${new Date().getFullYear()} AutoGO Pakistan</p>
      </div>
    `,
  });
}
