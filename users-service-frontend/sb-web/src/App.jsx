import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Mentors from './pages/Mentors';
import CreateProfile from './pages/CreateProfile';

export default function App() {
  return (
    <BrowserRouter>
      <header className="bg-slate-800 text-white px-6 py-3 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-wide">SkillBridge</h1>
          <nav className="space-x-6 text-sm">
            <NavLink to="/" className="hover:text-cyan-300">Home</NavLink>
            <NavLink to="/mentors" className="hover:text-cyan-300">Mentors</NavLink>
            <NavLink to="/create-profile" className="hover:text-cyan-300">Create</NavLink>
          </nav>
        </div>
      </header>

      <main className="min-h-[90vh] bg-gray-50">
        <div className="max-w-6xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mentors" element={<Mentors />} />
            <Route path="/create-profile" element={<CreateProfile />} />
          </Routes>
        </div>
      </main>

      <footer className="bg-slate-900 text-gray-400 text-center text-xs py-4">
        © 2025 SkillBridge — Mentorship Platform
      </footer>
    </BrowserRouter>
  );
}
