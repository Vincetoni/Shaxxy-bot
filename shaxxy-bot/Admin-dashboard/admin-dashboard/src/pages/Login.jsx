import { useState } from 'react';
import { API_URL } from '../config';

function Login() {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [devOtp, setDevOtp] = useState('');
    const [error, setError] = useState('');

    const sendOTP = async () => {
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await res.json();
            
            if (data.success) {
                setDevOtp(data.dev_otp);
                setStep(2);
            } else {
                setError(data.error || 'Failed to send OTP');
            }
        } catch (e) {
            setError('Network error: ' + e.message);
        }
    };

    const verifyOTP = async () => {
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp })
            });
            const data = await res.json();
            
            if (data.success) {
                // ✅ Save token - this is the key!
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // ✅ Force reload to trigger App.js check
                window.location.reload();
            } else {
                setError(data.error || 'Invalid OTP');
            }
        } catch (e) {
            setError('Network error: ' + e.message);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1>🤖 SHAXXY Admin</h1>
                
                {error && <div className="error">{error}</div>}
                
                {step === 1 ? (
                    <div>
                        <p>Enter your phone number</p>
                        <input 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g., 09135716534"
                        />
                        <button onClick={sendOTP}>Send OTP</button>
                    </div>
                ) : (
                    <div>
                        <p>Enter OTP (Dev: {devOtp})</p>
                        <input 
                            value={otp} 
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="Enter code"
                        />
                        <button onClick={verifyOTP}>Verify</button>
                        <button onClick={() => setStep(1)}>Back</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Login;