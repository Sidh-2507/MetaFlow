// utils/getUserFolder.js
import { nanoid } from "nanoid";

export function getUserFolder(token) {
  const payload = token.split(".")[1];
  const decoded = JSON.parse(atob(payload));

  const email = decoded.email || "anonymous";

  // Remove @domain and special characters
  const emailPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9.-]/g, "");

  // Get a fixed short ID per session
  const shortId = nanoid(6);

  return `${emailPrefix}-${shortId}`;
}
