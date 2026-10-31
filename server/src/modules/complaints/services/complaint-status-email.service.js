import { sendEmail } from '../../auth/services/email.service.js';

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export const sendComplaintStatusEmail = ({ email, fullName, complaint, status, note }) => {
  const safeName = escapeHtml(fullName);
  const safeTitle = escapeHtml(complaint.title);
  const safeStatus = escapeHtml(status);
  const safeNote = note ? escapeHtml(note) : '';
  const noteHtml = safeNote
    ? `<p><strong>Note from the team:</strong> ${safeNote}</p>`
    : '';

  return sendEmail({
    to: email,
    subject: `Update on complaint ${complaint.complaintId}`,
    text: `Hello ${fullName}, the status of "${complaint.title}" (${complaint.complaintId}) is now ${status}.${note ? ` Note: ${note}` : ''}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b"><h2>CivicConnect complaint update</h2><p>Hello ${safeName},</p><p>The status of <strong>${safeTitle}</strong> (${escapeHtml(complaint.complaintId)}) is now <strong>${safeStatus}</strong>.</p>${noteHtml}<p>Sign in to CivicConnect to view the full complaint timeline.</p></div>`,
  });
};
