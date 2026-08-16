import dns from 'dns/promises';

/**
 * Server-only: Validates if the domain has MX records.
 */
export async function hasValidMxRecord(email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) return false;

  try {
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch {
    // If no MX records found or other DNS error, return false
    return false;
  }
}
