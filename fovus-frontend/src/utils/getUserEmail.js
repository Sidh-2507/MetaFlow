export function getUserEmail(token) {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.email || null;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}
