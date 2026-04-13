import { useState, useEffect } from 'react';
import { BOT_API } from '../config';

function Overview() {
    const [status, setStatus] = useState(null);
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Refresh every 5s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            // Fetch all data
            const [statusRes, statsRes, logsRes] = await Promise.all([
                fetch(BOT_API.status),
                fetch(BOT_API.stats),
                fetch(BOT_API.logs)
            ]);
            
            const statusData = await statusRes.json();
            const statsData = await statsRes.json();
            const logsData = await logsRes.json();
            
            setStatus(statusData);
            setStats(statsData);
            setLogs(logsData.logs || []);
            setLoading(false);
        } catch (e) {
            console.error('Fetch error:', e);
        }
    };

    if (loading) return <div>Loading...</div>;

    // Format uptime
    const formatUptime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hrs}h ${mins}m`;
    };

    return (
        <div>
            <h1>📊 Bot Overview</h1>
            
            {/* Status Cards */}
            <div className="stats-grid">
                <div className="card">
                    <h3>Status</h3>
                    <p className={`status ${status?.status}`}>
                        ● {status?.status?.toUpperCase()}
                    </p>
                </div>
                
                <div className="card">
                    <h3>Uptime</h3>
                    <p>{formatUptime(status?.uptime)}</p>
                </div>
                
                <div className="card">
                    <h3>Total Users</h3>
                    <p>{stats?.users?.toLocaleString()}</p>
                </div>
                
                <div className="card">
                    <h3>Active Groups</h3>
                    <p>{stats?.groups}</p>
                </div>
                
                <div className="card">
                    <h3>Messages</h3>
                    <p>{stats?.messages?.toLocaleString()}</p>
                </div>
                
                <div className="card">
                    <h3>Active Today</h3>
                    <p>{stats?.activeToday}</p>
                </div>
            </div>

            {/* Recent Logs */}
            <h2>📝 Recent Activity</h2>
            <div className="logs-table">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>User</th>
                            <th>Group</th>
                            <th>Action</th>
                            <th>XP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.slice(0, 20).map((log, i) => (
                            <tr key={i}>
                                <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                                <td>{log.user_id?.split('@')[0]}</td>
                                <td>{log.group_id?.split('@')[0]}</td>
                                <td>{log.message_type}</td>
                                <td>+{log.xp_gained}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Overview;