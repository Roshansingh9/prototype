// src/App.tsx
import { useEffect } from 'react';
import { db } from './db/db';

function App() {
  
  useEffect(() => {
    // Just accessing the db is enough to ensure it opens
    console.log("Database initialized:", db.name);
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Restaurant POS - Offline First</h1>
      <p>System Running. Database Active.</p>
    </div>
  )
}

export default App