export function generateToken(): string {
  // Simple token generation - in production, use JWT or similar
  return Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');
}

export function validateAdminToken(token: string | undefined): boolean {
  // Simple validation - in production, use JWT or similar
  // For now, we'll just check if a token exists
  return !!token;
}

