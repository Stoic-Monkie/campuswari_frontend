/*
  Name of the query parameter in the emailed verification and reset links:
  /verify-email?token=...  and  /reset-password?token=...
  UNCONFIRMED: check mail/MailTemplates.java (docs/frontend/api_model.md section 9).
  If the backend uses another name or path, change it here and in router.tsx.
*/
export const TOKEN_PARAM = "token";
