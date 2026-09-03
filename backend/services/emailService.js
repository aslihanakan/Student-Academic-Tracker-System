const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

let transporter = null;
let etherealTransporter = null;

function getNodeMailer() {
    try {
        return require("nodemailer");
    } catch (e) {
        return null;
    }
}

async function getTransporter() {
    if (transporter) return transporter;

    const nodemailer = getNodeMailer();
    if (!nodemailer) {
        console.log("[EmailService] nodemailer package not loaded. Running in Dev/Console mode.");
        return null;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    if (host && user && pass) {
        transporter = nodemailer.createTransport({
            host: host,
            port: port,
            secure: secure,
            auth: {
                user: user,
                pass: pass
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        console.log(`[EmailService] Configured custom SMTP transporter: ${host}:${port} (${user})`);
        return transporter;
    }

    if (etherealTransporter) return etherealTransporter;

    try {
        const testAccount = await nodemailer.createTestAccount();
        etherealTransporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        console.log(`[EmailService] Created Ethereal test inbox: ${testAccount.user}`);
        return etherealTransporter;
    } catch (e) {
        console.warn("[EmailService] Ethereal test account setup skipped/offline:", e.message);
        return null;
    }
}

/**
 * Sends a password reset verification email.
 * @param {string} toEmail - Recipient email address
 * @param {string} userName - Name of the user
 * @param {string} code - 6-digit verification code
 * @returns {Promise<{success: boolean, mode: string, previewUrl?: string, code?: string}>}
 */
async function sendPasswordResetEmail(toEmail, userName, code) {
    const fromAddress = process.env.SMTP_FROM || `"Academi Buddy" <no-reply@academibuddy.com>`;
    const safeName = userName || "Student";
    const subject = `🔐 Academi Buddy - Şifre Sıfırlama Doğrulama Kodunuz: ${code}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Şifre Sıfırlama Kodu</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; line-height: 1.6; }
            .email-container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 14px; }
            .content { padding: 32px 28px; }
            .greeting { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
            .text { font-size: 14px; color: #475569; margin-bottom: 24px; }
            .code-box { background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .code-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #15803d; font-weight: 700; margin-bottom: 6px; }
            .code-digits { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #166534; font-family: 'Courier New', Courier, monospace; }
            .expiry-note { font-size: 12.5px; color: #64748b; text-align: center; margin-top: 8px; }
            .security-box { background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 12px 16px; margin: 24px 0 12px 0; font-size: 13px; color: #991b1b; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
            .footer a { color: #3b82f6; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>🎓 Academi Buddy</h1>
                <p>Öğrenci Akademik Takip ve Başarı Platformu</p>
            </div>
            <div class="content">
                <div class="greeting">Merhaba ${safeName},</div>
                <div class="text">
                    Academi Buddy hesabınız için bir şifre sıfırlama talebinde bulundunuz. Aşağıdaki 6 haneli doğrulama kodunu kullanarak yeni şifrenizi hemen belirleyebilirsiniz:
                </div>
                
                <div class="code-box">
                    <div class="code-label">Şifre Sıfırlama Doğrulama Kodu</div>
                    <div class="code-digits">${code}</div>
                    <div class="expiry-note">⏳ Bu kod <strong>15 dakika</strong> süreyle geçerlidir.</div>
                </div>

                <div class="security-box">
                    <strong>⚠️ Güvenlik Uyarısı:</strong> Eğer bu sıfırlama talebini siz yapmadıysanız lütfen bu e-postayı dikkate almayınız. Şifreniz değişmeyecektir.
                </div>
            </div>
            <div class="footer">
                <p style="margin:0 0 6px 0;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen doğrudan yanıtlamayınız.</p>
                <p style="margin:0;">&copy; 2026 Academi Buddy. Tüm hakları saklıdır.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const textContent = `Merhaba ${safeName},\n\nAcademi Buddy hesabınız için şifre sıfırlama kodunuz: ${code}\n\nBu kod 15 dakika boyunca geçerlidir.\nEğer bu talebi siz yapmadıysanız bu mesajı görmezden gelebilirsiniz.\n\nAcademi Buddy Ekibi`;

    const mailOptions = {
        from: fromAddress,
        to: toEmail,
        subject: subject,
        text: textContent,
        html: htmlContent
    };

    const activeTransporter = await getTransporter();

    if (activeTransporter) {
        try {
            const info = await activeTransporter.sendMail(mailOptions);
            const nodemailer = getNodeMailer();
            const previewUrl = nodemailer && typeof nodemailer.getTestMessageUrl === "function" ? nodemailer.getTestMessageUrl(info) : null;

            if (previewUrl) {
                console.log(`[EmailService] 📬 E-posta gönderildi! Canlı Önizleme Bağlantısı: ${previewUrl}`);
            } else {
                console.log(`[EmailService] Password reset email sent to ${toEmail}. MessageId: ${info.messageId}`);
            }

            return {
                success: true,
                mode: previewUrl ? "ethereal" : "smtp",
                messageId: info.messageId,
                previewUrl: previewUrl || undefined,
                code: code
            };
        } catch (err) {
            console.error(`[EmailService] Failed to send email via SMTP to ${toEmail}:`, err.message);
            console.log(`[EmailService:DEV_FALLBACK] 🔐 Password reset code for ${toEmail}: >>> ${code} <<<`);
            return { success: true, mode: "fallback_console", code: code, error: err.message };
        }
    } else {
        console.log(`\n======================================================`);
        console.log(`[EmailService:DEV_MODE] 📧 PASSWORD RESET CODE FOR ${toEmail}`);
        console.log(`👤 User: ${safeName}`);
        console.log(`🔑 Verification Code: >>> ${code} <<<`);
        console.log(`⏳ Valid for: 15 minutes`);
        console.log(`======================================================\n`);
        return { success: true, mode: "dev_console", code: code };
    }
}

module.exports = {
    sendPasswordResetEmail
};
