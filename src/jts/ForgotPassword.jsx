// File: src/components/ForgotPassword.jsx
import React, { useState } from 'react';

export default function ForgotPassword({ onBackToLogin }) {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Submitting password reset request for:", email);
        setSubmitted(true);
    };

    return (
        <div className="max-w-xl mx-auto my-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 text-slate-100">
            <div className="text-center space-y-2">
                <h4 className="text-2xl font-bold tracking-tight text-white">Forgot Password</h4>
                <p className="text-xs text-slate-400">Provide your email address to initiate recovery</p>
            </div>

            {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Email Address
                        </label>
                        <input
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition"
                            placeholder="name@example.com"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl font-bold transition text-sm shadow-lg shadow-teal-500/10"
                    >
                        Reset Password
                    </button>
                </form>
            ) : (
                <div className="text-center space-y-4 py-4">
                    <div className="text-3xl">📧</div>
                    <p className="text-sm text-emerald-400 font-medium">Recovery link dispatched successfully!</p>
                    <p className="text-xs text-slate-400">Please review your inbox for further setup instructions.</p>
                </div>
            )}

            <div className="text-center">
                <button
                    onClick={onBackToLogin}
                    className="text-xs text-slate-400 hover:text-teal-400 transition"
                >
                    ← Return to Login Page
                </button>
            </div>
        </div>
    );
}
