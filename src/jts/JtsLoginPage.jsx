import React, { useState } from 'react';

export default function JtsLoginPage({ onForgotPassword, onLoginSuccess, onGoRegister, onLogin, onGoReapply }) {
    const [credentials, setCredentials] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await onLogin({
                username: credentials.email.trim(),
                password: credentials.password
            });
            onLoginSuccess?.();
        } catch (err) {
            setError(err.message || 'Invalid username or password.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-xl py-16 text-slate-100">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-8">
                <div className="text-center">
                    <h4 className="text-2xl font-bold tracking-tight text-white">Login</h4>
                    <p className="mt-2 text-xs text-slate-400">Access your CRM portal account</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Email
                        </label>
                        <input
                            required
                            type="email"
                            value={credentials.email}
                            onChange={(event) => setCredentials({ ...credentials, email: event.target.value })}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-teal-500"
                            placeholder="name@example.com"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Password
                        </label>
                        <input
                            required
                            type="password"
                            value={credentials.password}
                            onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-teal-500"
                            placeholder="Password"
                            disabled={isSubmitting}
                        />
                    </div>

                    {onForgotPassword && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={onForgotPassword}
                                className="text-xs font-semibold text-teal-400 transition hover:text-teal-300 cursor-pointer"
                                disabled={isSubmitting}
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="auth-error" role="alert" style={{
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fee2e2',
                            color: '#991b1b',
                            padding: '12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            marginTop: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            <span>{error}</span>
                            {error.includes('rejected') && onGoReapply && (
                                <button
                                    type="button"
                                    onClick={() => onGoReapply(credentials.email)}
                                    className="bg-red-800 text-white rounded-lg px-3 py-1.5 text-xs font-bold w-fit hover:bg-red-700 transition cursor-pointer self-start border-0"
                                >
                                    Update & Reapply
                                </button>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-teal-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-400 cursor-pointer disabled:opacity-50"
                    >
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </button>

                    {onGoRegister && (
                        <p className="text-center text-xs text-slate-400">
                            Don&apos;t have an account?{' '}
                            <button
                                type="button"
                                onClick={onGoRegister}
                                className="font-semibold text-teal-400 transition hover:text-teal-300 cursor-pointer"
                                disabled={isSubmitting}
                            >
                                Register
                            </button>
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
