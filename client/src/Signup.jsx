import React, { useState } from 'react';
import './Signup.css'; // ✅ Use your separate CSS file

function Signup({ onSignupComplete, switchToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // ✅ Inline error

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const res = await fetch('http://localhost:3001/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      onSignupComplete();
    } else {
      const errorText = await res.text();
      if (errorText.includes('Username already exists')) {
        setErrorMessage('Signup failed. Username already exists. Please choose another.');
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="signup-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSignup} className="signup-form">
        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="signup-input"
          />
        </div>
        <div style={{ marginTop: '10px' }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="signup-input"
          />
        </div>
        <div>
          <button type="submit" className="signup-button">
            Sign Up
          </button>
        </div>
      </form>

      {errorMessage && (
        <p className="signup-error">{errorMessage}</p>
      )}

      <p className="signup-switch">
        Already have an account?{' '}
        <button onClick={switchToLogin}>Log In</button>
      </p>
    </div>
  );
}

export default Signup;
