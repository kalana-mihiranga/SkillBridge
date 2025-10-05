import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Mentors from './pages/Mentors';
import CreateProfile from './pages/CreateProfile';
import PublishAvailability from './pages/PublishAvailability';
import Bookings from './pages/Bookings';

export default function App() {
  return (
    <BrowserRouter>
       <header className="fixed inset-x-0 top-0 z-50 bg-slate-800 text-white px-6 h-14 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-wide">SkillBridge</h1>
          <nav className="space-x-6 text-sm">
            <NavLink to="/" className="hover:text-cyan-300">Home</NavLink>
            <NavLink to="/mentors" className="hover:text-cyan-300">Mentors</NavLink>
           
<NavLink to="/create-profile" className="hover:text-cyan-300">Create</NavLink>
 <NavLink to="/publish-availability" className="hover:text-cyan-300">Availability</NavLink>
 <NavLink to="/bookings" className="hover:text-cyan-300">Bookings</NavLink>
          </nav>
        </div>
      </header>

      <main className="min-h-[90vh] bg-gray-50">
        <div className="max-w-6xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mentors" element={<Mentors />} />
            <Route path="/create-profile" element={<CreateProfile />} />
            <Route path="/publish-availability" element={<PublishAvailability />} />
            <Route path="/bookings" element={<Bookings />} />
          </Routes>
        </div>
      </main>

      <footer className="bg-slate-900 text-gray-400 text-center text-xs py-4">
        © 2025 SkillBridge — Mentorship Platform
      </footer>
    </BrowserRouter>
  );
}
