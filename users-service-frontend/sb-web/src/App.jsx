import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Mentors from './pages/Mentors';
import CreateProfile from './pages/CreateProfile';

export default function App() {
  return (

    
    <BrowserRouter>
      <div style={{ padding: 12, borderBottom: '1px solid #eee', marginBottom: 12 }}>
        <Link to="/" style={{ marginRight: 12 }}>Home</Link>
        <Link to="/mentors" style={{ marginRight: 12 }}>Mentors</Link>
        <Link to="/create-profile">Create Profile</Link>
      </div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mentors" element={<Mentors />} />
        <Route path="/create-profile" element={<CreateProfile />} />
      </Routes>
    </BrowserRouter>
  );
}
