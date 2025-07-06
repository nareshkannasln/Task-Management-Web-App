import React, { useState } from 'react';
import KanbanBoardWrapper from './KanbanBoard';
import Login from './Login';
import Signup from './Signup';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showSignup, setShowSignup] = useState(false);
  const [username, setUsername] = useState('');

  if (isLoggedIn) {
    return (
      <div>
        <h1 style={{ textAlign: 'center' }}>Kanban Board</h1>
        <KanbanBoardWrapper username={username} />
      </div>
    );
  }

  if (showSignup) {
    return (
      <Signup
        onSignupComplete={() => setShowSignup(false)}
        switchToLogin={() => setShowSignup(false)}
      />
    );
  }

  return (
    <Login
      onLoginSuccess={(username) => {
        setUsername(username);
        setIsLoggedIn(true);
      }}
      switchToSignup={() => setShowSignup(true)}
    />
  );
}

export default App;
