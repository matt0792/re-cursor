import React, { useState } from "react";
import "./WaitList.css";

const WaitList = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  return (
    <div className="waitlist-container">
      <div className="waitlist-card">
        <h1 className="waitlist-title">
          <span className="orange">Alpha</span> Access
        </h1>

        {!submitted ? (
          <>
            <p className="waitlist-description">
              Our app is not publicly available yet. Join the waitlist to be
              notified when applications for alpha testers open.
            </p>

            <form className="waitlist-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  className="waitlist-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {error && <div className="error-message">{error}</div>}
              </div>

              <button
                type="submit"
                className="waitlist-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner">⟳</span>&nbsp;Joining...
                  </>
                ) : (
                  "Join Waitlist"
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="success-message">
            <h2 className="success-title">You're in!</h2>
            <p className="success-description">
              Thanks for joining our waitlist. We'll notify you as soon as alpha
              testing applications open.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitList;
