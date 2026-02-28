import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send email function
export const sendEmail = async (options) => {
  try {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('📧 Email not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      html: options.html || options.text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Email templates
export const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to Helping Hands Community!',
    html: `
      <h2>Welcome ${name}! 🎉</h2>
      <p>Thank you for joining Helping Hands Community Service Management System.</p>
      <p>You can now start participating in community service events and making a difference!</p>
      <p>Best regards,<br/>Helping Hands Team</p>
    `
  }),

  eventRegistration: (volunteerName, eventTitle, eventDate) => ({
    subject: `Registration Confirmed: ${eventTitle}`,
    html: `
      <h2>Registration Confirmed! ✅</h2>
      <p>Hi ${volunteerName},</p>
      <p>You have successfully registered for <strong>${eventTitle}</strong></p>
      <p><strong>Event Date:</strong> ${new Date(eventDate).toLocaleString()}</p>
      <p>We look forward to seeing you there!</p>
      <p>Best regards,<br/>Helping Hands Team</p>
    `
  }),

  eventApproval: (organizerName, eventTitle) => ({
    subject: `Event Approved: ${eventTitle}`,
    html: `
      <h2>Event Approved! 🎉</h2>
      <p>Hi ${organizerName},</p>
      <p>Your event <strong>${eventTitle}</strong> has been approved by our admin team.</p>
      <p>It is now visible to volunteers and open for registrations!</p>
      <p>Best regards,<br/>Helping Hands Team</p>
    `
  }),

  volunteerRegistrationToOrganizer: (organizerName, volunteerName, eventTitle) => ({
    subject: `New Volunteer Registration: ${eventTitle}`,
    html: `
      <h2>New Volunteer Registered! 🙌</h2>
      <p>Hi ${organizerName},</p>
      <p><strong>${volunteerName}</strong> has registered for your event <strong>${eventTitle}</strong>.</p>
      <p>You can view all registrations in your organizer dashboard.</p>
      <p>Best regards,<br/>Helping Hands Team</p>
    `
  }),

  eventReminder: (volunteerName, eventTitle, eventDate) => ({
    subject: `Reminder: ${eventTitle} is Tomorrow!`,
    html: `
      <h2>Event Reminder! ⏰</h2>
      <p>Hi ${volunteerName},</p>
      <p>This is a reminder that you are registered for <strong>${eventTitle}</strong>.</p>
      <p><strong>Event Date:</strong> ${new Date(eventDate).toLocaleString()}</p>
      <p>Don't forget to attend!</p>
      <p>Best regards,<br/>Helping Hands Team</p>
    `
  }),

  eventCancellation: (volunteerName, eventTitle) => ({
    subject: `Event Cancelled: ${eventTitle}`,
    html: `
      <h2>Event Cancelled ❌</h2>
      <p>Hi ${volunteerName},</p>
      <p>We regret to inform you that <strong>${eventTitle}</strong> has been cancelled.</p>
      <p>Please check our platform for other upcoming events.</p>
      <p>Best regards,<br/>Helping Hands Team</p>
    `
  })
};
