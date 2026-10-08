const { Resend } = require("resend");
const { RESEND_API_KEY, FROM_EMAIL } = require("../config/config");

// Initialize Resend client safely
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;


/**
 * Send welcome email to newly added group member with 3-code login system
 * @param {Object} memberData - Member information
 * @param {string} memberData.name - Member's full name
 * @param {string} memberData.email - Member's email address
 * @param {string} memberData.touristId - Member's unique tourist ID
 * @param {string} guideId - Tour admin's tourist ID
 * @param {string} groupAccessCode - Group's access code
 * @param {string} groupName - Name of the tour group
 * @param {string} adminName - Name of the tour admin
 * @returns {Promise<Object>} - Email send result
 */
const sendWelcomeEmail = async (memberData, guideId, groupAccessCode, groupName, adminName) => {
  try {
    const { name, email, touristId } = memberData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
            color: #ffffff;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 30px;
          }
          .content h2 {
            color: #3B82F6;
            font-size: 22px;
            margin-top: 0;
          }
          .info-box {
            background-color: #F3F4F6;
            border-left: 4px solid #3B82F6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info-box p {
            margin: 8px 0;
          }
          .info-box strong {
            color: #1F2937;
          }
          .credentials-box {
            background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
            border: 3px solid #F59E0B;
            padding: 25px;
            margin: 30px 0;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(245, 158, 11, 0.1);
          }
          .credentials-box h3 {
            color: #D97706;
            margin-top: 0;
            font-size: 20px;
            margin-bottom: 20px;
          }
          .credential-item {
            background-color: #ffffff;
            padding: 18px;
            margin: 15px 0;
            border-radius: 8px;
            border: 2px solid #FBBF24;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .credential-label {
            font-size: 12px;
            color: #78350F;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 5px;
          }
          .credential-value {
            font-family: 'Courier New', monospace;
            font-size: 24px;
            font-weight: 700;
            color: #1F2937;
            letter-spacing: 2px;
          }
          .button {
            display: inline-block;
            background-color: #3B82F6;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 35px;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
          }
          .button:hover {
            background-color: #2563EB;
          }
          .warning {
            background-color: #FEE2E2;
            border-left: 4px solid #EF4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            color: #991B1B;
          }
          .footer {
            background-color: #F9FAFB;
            padding: 20px 30px;
            text-align: center;
            color: #6B7280;
            font-size: 14px;
            border-top: 1px solid #E5E7EB;
          }
          .footer a {
            color: #3B82F6;
            text-decoration: none;
          }
          ul {
            padding-left: 20px;
          }
          li {
            margin: 8px 0;
          }
          .highlight-box {
            background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%);
            border: 2px solid #3B82F6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>🛡️ Welcome to Smart Tourist Safety</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${name}! 👋</h2>
            
            <p>Welcome to your travel group! <strong>${adminName}</strong> has added you to the <strong>${groupName}</strong> tour group.</p>
            
            <div class="info-box">
              <p><strong>🎯 What is Smart Tourist Safety?</strong></p>
              <p>A comprehensive mobile application designed to keep you safe during your travels. Track your group, receive safety alerts, and access emergency services instantly.</p>
            </div>

            <div class="credentials-box">
              <h3>🔑 Your Login Credentials</h3>
              <p style="margin: 0 0 20px 0; color: #78350F; font-size: 14px;">
                Use these <strong>THREE codes</strong> to login to the app:
              </p>
              
              <div class="credential-item">
                <div class="credential-label">📍 Guide ID</div>
                <div class="credential-value">${guideId}</div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">👤 Tourist ID</div>
                <div class="credential-value">${touristId}</div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">🔐 Group Access Code</div>
                <div class="credential-value">${groupAccessCode}</div>
              </div>
            </div>

            <div class="warning">
              <strong>⚠️ Important:</strong>
              <p style="margin: 5px 0 0 0;">Keep these codes safe! You will need all THREE to access the app. Save this email for future reference.</p>
            </div>

            <div class="highlight-box">
              <h3 style="color: #1F2937; margin-top: 0;">📱 How to Login:</h3>
              <ol style="text-align: left; color: #1F2937;">
                <li>Download the <strong>Smart Tourist Safety</strong> app</li>
                <li>Tap on <strong>"Login as Group Member"</strong></li>
                <li>Enter all three codes exactly as shown above</li>
                <li>Tap <strong>"Login"</strong> to access your group</li>
              </ol>
            </div>

            <h3 style="color: #1F2937;">✨ Key Features:</h3>
            <ul>
              <li><strong>Real-time Location Tracking:</strong> Your guide can monitor your safety</li>
              <li><strong>SOS Emergency Button:</strong> Instant alert to authorities and group members</li>
              <li><strong>Safety Alerts:</strong> Get notified about nearby incidents and risks</li>
              <li><strong>Group Communication:</strong> Stay connected with your travel companions</li>
              <li><strong>Smart Itinerary:</strong> Access your trip schedule and locations</li>
            </ul>

            <center>
              <a href="#" class="button">📲 Download App Now</a>
            </center>

            <div class="info-box" style="margin-top: 30px;">
              <p><strong>Need Help?</strong></p>
              <p>If you have any questions or need assistance, please contact your tour guide <strong>${adminName}</strong> or reach out to our support team.</p>
            </div>
          </div>

          <div class="footer">
            <p><strong>Smart Tourist Safety</strong></p>
            <p>Empowering safe travel experiences worldwide</p>
            <p style="margin-top: 15px;">
              <a href="#">Privacy Policy</a> • 
              <a href="#">Terms of Service</a> • 
              <a href="#">Support</a>
            </p>
            <p style="margin-top: 10px; font-size: 12px; color: #9CA3AF;">
              This email was sent because you were added to a tour group. If you believe this was a mistake, please contact your tour guide.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!resend) {
      console.log(`ℹ️ [EmailService] RESEND_API_KEY not configured. Simulated welcome email to ${email}`);
      return { success: true, simulated: true };
    }


    const result = await resend.emails.send({
      from: FROM_EMAIL || "Smart Tourist Safety <onboarding@resend.dev>",
      to: email,
      subject: `Welcome to ${groupName} - Your Login Credentials`,

      html: htmlContent,
    });

    if (result?.error) {
      throw new Error(result.error.message || "Email provider rejected welcome email request");
    }

    const messageId = result?.data?.id || result?.id || null;
    if (!messageId) {
      throw new Error("Email provider did not return a message id");
    }

    console.log("Welcome email sent successfully:", result);
    return { success: true, messageId };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send profile update notification email
 * @param {string} memberEmail - Member's email address
 * @param {string} memberName - Member's name
 * @param {Array<string>} updatedFields - List of fields that were updated
 * @param {string} adminName - Name of the admin who made changes
 * @returns {Promise<Object>} - Email send result
 */
const sendProfileUpdateEmail = async (memberEmail, memberName, updatedFields, adminName) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            background-color: #3B82F6;
            color: #ffffff;
            padding: 20px 30px;
            text-align: center;
          }
          .content {
            padding: 30px;
          }
          .info-box {
            background-color: #F3F4F6;
            border-left: 4px solid #3B82F6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            background-color: #F9FAFB;
            padding: 20px 30px;
            text-align: center;
            color: #6B7280;
            font-size: 14px;
            border-top: 1px solid #E5E7EB;
          }
          ul {
            background-color: #FEF3C7;
            padding: 20px 20px 20px 40px;
            border-radius: 6px;
            border: 1px solid #FCD34D;
          }
          li {
            margin: 8px 0;
            color: #78350F;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h2 style="margin: 0;">📝 Profile Updated</h2>
          </div>
          
          <div class="content">
            <h3>Hello ${memberName},</h3>
            <p>Your profile information has been updated by your tour admin <strong>${adminName}</strong>.</p>
            
            <h4>The following fields were modified:</h4>
            <ul>
              ${updatedFields.map((field) => `<li>${field}</li>`).join("")}
            </ul>

            <div class="info-box">
              <p><strong>ℹ️ Please Review:</strong></p>
              <p>We recommend logging into the app to review your updated profile information and ensure all details are correct.</p>
            </div>

            <p>If you have any questions about these changes, please contact your tour admin.</p>
          </div>

          <div class="footer">
            <p><strong>Smart Tourist Safety</strong></p>
            <p style="font-size: 12px; color: #9CA3AF; margin-top: 10px;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: FROM_EMAIL || "Smart Tourist Safety <onboarding@resend.dev>",
      to: memberEmail,
      subject: "Your Profile Has Been Updated",
      html: htmlContent,
    });

    if (result?.error) {
      throw new Error(result.error.message || "Email provider rejected profile update email request");
    }

    const messageId = result?.data?.id || result?.id || null;
    if (!messageId) {
      throw new Error("Email provider did not return a message id");
    }

    console.log("Profile update email sent successfully:", result);
    return { success: true, messageId };
  } catch (error) {
    console.error("Error sending profile update email:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send bulk welcome emails (for bulk add operations or send-all button)
 * @param {Array<Object>} members - Array of member objects with name, email, touristId
 * @param {string} guideId - Tour admin's tourist ID
 * @param {string} groupAccessCode - Group access code
 * @param {string} groupName - Name of the tour group
 * @param {string} adminName - Name of the tour admin
 * @returns {Promise<Object>} - Results of all email sends
 */
const sendBulkWelcomeEmails = async (members, guideId, groupAccessCode, groupName, adminName) => {
  const results = await Promise.allSettled(
    members.map((member) => sendWelcomeEmail(member, guideId, groupAccessCode, groupName, adminName))
  );

  const successCount = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
  const failureCount = results.length - successCount;

  console.log(`Bulk email results: ${successCount} sent, ${failureCount} failed`);

  return {
    total: results.length,
    successful: successCount,
    failed: failureCount,
    results: results,
  };
};

module.exports = {
  sendWelcomeEmail,
  sendProfileUpdateEmail,
  sendBulkWelcomeEmails,
};
