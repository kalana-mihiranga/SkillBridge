import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Mentors from './pages/Mentors';
import CreateProfile from './pages/CreateProfile';
import PublishAvailability from './pages/PublishAvailability';
import Bookings from './pages/Bookings';
import NotifBell from './components/NotifBell';import PairSession from './pages/PairSession';
export default function App() {
  return (
    <BrowserRouter>
      {/* fixed header */}
      <header className="fixed inset-x-0 top-0 z-50 bg-slate-800 text-white px-6 h-14 shadow">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-wide">SkillBridge</h1>
          <nav className="space-x-6 text-sm">
            <NavLink to="/" className="hover:text-cyan-300">Home</NavLink>
            <NavLink to="/mentors" className="hover:text-cyan-300">Mentors</NavLink>
            <NavLink to="/create-profile" className="hover:text-cyan-300">Create</NavLink>
            <NavLink to="/publish-availability" className="hover:text-cyan-300">Availability</NavLink>
            <NavLink to="/bookings" className="hover:text-cyan-300">Bookings</NavLink>
             <NotifBell />
          </nav>
        </div>
      </header>

      <main className="min-h-[90vh] bg-gray-50 pt-14">
        <div className="max-w-6xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mentors" element={<Mentors />} />
            <Route path="/create-profile" element={<CreateProfile />} />
            <Route path="/publish-availability" element={<PublishAvailability />} />
            <Route path="/bookings" element={<Bookings />} /><Route path="/pair" element={<PairSession />} />
          </Routes>
        </div>
      </main>

      <footer className="bg-slate-900 text-gray-400 text-center text-xs py-3">
        © 2025 SkillBridge — Mentorship Platform
      </footer>
    </BrowserRouter>
  );
}
