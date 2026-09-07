import React, { useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export default function PasswordResetConfirm({ uidb64, token, onBackToLogin }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setGeneralError('');

        if (newPassword !== confirmPassword) {
            setGeneralError("Passwords do not match.");
            return;
        }

        if (newPassword.length < 8) {
            setGeneralError("Password must be at least 8 characters.");
            return;
        }

        setIsSubmitting(true);

        const payload = {
            uidb64,
            token,
            new_password: newPassword,
            confirm_password: confirmPassword
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password/confirm/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();

            if (!response.ok || responseData.success === false) {
                if (responseData.errors) {
                    setErrors(responseData.errors);
                    setGeneralError(responseData.message || "Password reset validation failed.");
                } else {
                    setGeneralError(responseData.message || "Failed to reset password.");
                }
            } else {
                setIsSuccess(true);
            }
        } catch (err) {
            setGeneralError("Network connection failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="max-w-xl mx-auto my-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 text-slate-100 text-center">
                <div className="text-3xl">🔑</div>
                <h4 className="text-2xl font-bold tracking-tight text-white">Password Updated</h4>
                <p className="text-sm text-emerald-400 font-medium">Your password has been successfully reset!</p>
                <p className="text-xs text-slate-400">You can now proceed to log in to your account with your new password.</p>
                <div className="pt-4">
                    <button
                        onClick={onBackToLogin}
                        className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl font-bold transition text-sm"
                    >
                        Go to Login Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto my-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 text-slate-100">
            <div className="text-center space-y-2">
                <h4 className="text-2xl font-bold tracking-tight text-white">Reset Password</h4>
                <p className="text-xs text-slate-400">Specify your secure new password</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        New Password
                    </label>
                    <input
                        required
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`w-full bg-slate-950 border focus:border-teal-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition ${errors.new_password ? 'border-red-500' : 'border-slate-800'}`}
                        placeholder="••••••••"
                        disabled={isSubmitting}
                    />
                    {errors.new_password && (
                        <div className="mt-2 text-xs text-red-500 space-y-1">
                            {errors.new_password.map((err, i) => (
                                <p key={i}>• {err}</p>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Confirm New Password
                    </label>
                    <input
                        required
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition"
                        placeholder="••••••••"
                        disabled={isSubmitting}
                    />
                </div>

                {generalError && (
                    <div className="auth-error" role="alert" style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fee2e2',
                        color: '#991b1b',
                        padding: '12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        marginTop: '12px'
                    }}>
                        {generalError}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl font-bold transition text-sm shadow-lg shadow-teal-500/10 cursor-pointer disabled:opacity-50"
                >
                    {isSubmitting ? 'Confirming Reset...' : 'Confirm Reset Password'}
                </button>
            </form>

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
