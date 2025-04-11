import React, { useState } from "react";
import axios from "axios";
import { nanoid } from "nanoid";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserFolder } from "./utils/getUserFolder";
import { getUserEmail } from "./utils/getUserEmail";

function App() {
  const navigate = useNavigate();

  // check authentication and auto logout after 2 minutes
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");

    if (!token) {
      // Redirect to login if token not found
      navigate("/login");
      return;
    }

    //set up auto logout
    const timeout = setTimeout(() => {
      localStorage.removeItem("jwtToken");
      alert("Session expired. Please login again.");
      navigate("/login");
    }, 120000); // 2 minutes

    // clean up time out
    return () => clearTimeout(timeout); // cleanup
  }, [navigate]);

  // states for form inputs and message
  const [fullName, setFullName] = useState("");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  // API endpoints
  const API_URL = process.env.REACT_APP_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !fullName) return alert("Please fill in all fields");

    const token = localStorage.getItem("jwtToken"); // get token
    const email = getUserEmail(token); // get user email
    const folder = getUserFolder(token); // get user folder
    const id = nanoid(); //  generate a unique ID
    const inputFileName = file.name; // get file name
    const fullPath = `${folder}/${inputFileName}`; // combine folder and file name

    try {
      // 1. Get pre-signed URL from Lambda
      const presignedUrl = await axios.get(
        `https://6gkguovd32.execute-api.us-east-2.amazonaws.com/prod/presign?fileName=${fullPath}`
      );
      const url = presignedUrl.data.url;

      // 2. Upload file to S3 using pre-signed URL
      await axios.put(url, file, {
        headers: {
          "Content-Type": file.type,
        },
      });

      // 3. Send metadata to Lambda (via API Gateway)
      const token = localStorage.getItem("jwtToken");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          inputText: fullName,
          inputFilePath: `${url.split("?")[0]}`, // clean file URL
          email,
        }),
      });

      if (!response.ok) {
        throw new Error("Authorization failed or save error.");
      }

      setMessage("File uploaded and metadata saved successfully!");
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      {/* Logout Button code clears token and redirects to login page*/}
      <button
        onClick={() => {
          localStorage.removeItem("jwtToken");
          window.location.href = "/login";
        }}
        className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Logout
      </button>
      {/* upload Form */}
      <div className="flex items-center justify-center mt-16">
        <form
          className="bg-white p-6 rounded-lg shadow-md space-y-4 w-full max-w-md"
          onSubmit={handleSubmit}
        >
          <h2 className="text-xl font-semibold text-center">
            Fovus File Uploader
          </h2>
          {/* form inputs */}
          <input
            type="text"
            placeholder="Your Full Name"
            className="w-full px-4 py-2 border rounded"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            type="file"
            accept=".input"
            className="w-full"
            onChange={(e) => setFile(e.target.files[0])}
          />
          {/* submit button */}
          <button
            type="submit"
            className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 transition"
          >
            Submit
          </button>
          {/* Display message */}
          {message && (
            <p className="text-center text-sm text-gray-600">{message}</p>
          )}
        </form>
      </div>
    </div>
  );
}

export default App;
