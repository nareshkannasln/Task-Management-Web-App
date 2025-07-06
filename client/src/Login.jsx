import React, { useState } from 'react';
import './Login.css'; // ✅ Import your separate CSS

function Login({ onLoginSuccess, switchToSignup }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const res = await fetch('http://localhost:3001/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      onLoginSuccess(username);
    } else {
      const errorText = await res.text();
      if (errorText.includes('Invalid credentials')) {
        setErrorMessage(
          "Account doesn't exist or password is wrong. Please sign up if needed."
        );
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin} className="login-form">
        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="login-input"
          />
        </div>
        <div style={{ marginTop: '10px' }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
        </div>
        <div>
          <button type="submit" className="login-button">
            Login
          </button>
        </div>
      </form>

      {errorMessage && (
        <p className="login-error">{errorMessage}</p>
      )}

      <p className="login-switch">
        Don’t have an account?{' '}
        <button onClick={switchToSignup}>Sign Up</button>
      </p>
    </div>
  );
}

export default Login;
