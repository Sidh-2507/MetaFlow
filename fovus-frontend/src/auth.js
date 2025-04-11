import React, { useState } from "react";
import { loginUser } from "./authentication/authService";
import { useNavigate } from "react-router-dom";

/**
 * Auth component for Cognito-based login
 * Allows users to sign in with email and password
 * Stores token on success and redirects to the uploader page
 */

export default function Auth() {
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  /**
   * Handles login form submission
   * Calls loginUser() and stores token on success
   */
  const handleLogin = (e) => {
    e.preventDefault();
    loginUser(email, password, (err, token) => {
      if (err) {
        setStatus(err.message); // set error message
      } else {
        setStatus("Logged in successfully"); // set success message
        navigate("/");
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      {/* Login form */}
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm space-y-4"
      >
        <h2 className="text-xl font-semibold text-center">Login</h2>
        {/* Form inputs */}
        <input
          type="email"
          className="w-full px-4 py-2 border rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full px-4 py-2 border rounded"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
        {/* Status message */}
        <p className="text-center text-sm text-gray-500">{status}</p>
      </form>
    </div>
  );
}
