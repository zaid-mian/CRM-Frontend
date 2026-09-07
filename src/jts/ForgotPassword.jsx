import React, { useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export default function ForgotPassword({ onBackToLogin }) {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email.trim().toLowerCase() })
            });

            const responseData = await response.json();

            if (!response.ok || responseData.success === false) {
                setError(responseData.message || 'Request failed.');
            } else {
                setSuccessMessage(responseData.message || 'Recovery link dispatched successfully!');
                setSubmitted(true);
            }
        } catch (err) {
            setError('Network connection failed.');
        } finally {
            setIsSubmitting(false);
        }
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
                            disabled={isSubmitting}
                        />
                    </div>

                    {error && (
                        <div className="auth-error" role="alert" style={{
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fee2e2',
                            color: '#991b1b',
                            padding: '12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            marginTop: '12px'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl font-bold transition text-sm shadow-lg shadow-teal-500/10 cursor-pointer disabled:opacity-50"
                    >
                        {isSubmitting ? 'Initiating Reset...' : 'Reset Password'}
                    </button>
                </form>
            ) : (
                <div className="text-center space-y-4 py-4">
                    <div className="text-3xl">📧</div>
                    <p className="text-sm text-emerald-400 font-medium">{successMessage}</p>
                    <p className="text-xs text-slate-400">Please review your inbox for further setup instructions.</p>
                </div>
            )}

            <div className="text-center">
                <button
                    onClick={onBackToLogin}
                    className="text-xs text-slate-400 hover:text-teal-400 transition cursor-pointer"
                >
                    ← Return to Login Page
                </button>
            </div>
        </div>
    );
}
