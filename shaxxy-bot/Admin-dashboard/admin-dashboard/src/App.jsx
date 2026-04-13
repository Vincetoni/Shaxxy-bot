import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Overview from './pages/overview';
import Groups from './pages/Groups';
import Users from './pages/Users';
import Economy from './pages/Economy';
import Login from './pages/Login';
import './App.css';

function App() {
    const isLoggedIn = localStorage.getItem('adminToken');

    if (!isLoggedIn) {
        return <Login />;
    }

    return (
        <Router>
            <div className="admin-layout">
                <nav className="sidebar">

                    <h2>🤖 SHAXXY Admin</h2>
                    <ul>
                        <li><Link to="/">📊 Overview</Link></li>
                        <li><Link to="/groups">👥 Groups</Link></li>
                        <li><Link to="/users">🧑 Users</Link></li>
                        <li><Link to="/economy">💰 Economy</Link></li>
                    </ul>
                    <button onClick={() => {
                        localStorage.removeItem('adminToken');
                        window.location.reload();
                    }}>Logout</button>
                </nav>
                
                <main className="content">
                    <Routes>
                        <Route path="/" element={<Overview />} />
                        <Route path="/groups" element={<Groups />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/economy" element={<Economy />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;