import React, { useState } from 'react';

export default function JtsLoginPage({ onForgotPassword, onLoginSuccess, onGoRegister }) {
    const [credentials, setCredentials] = useState({
        email: '',
        password: '',
    });

    const handleSubmit = (event) => {
        event.preventDefault();
        console.log('Login form payload:', credentials);
        onLoginSuccess?.();
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
                        />
                    </div>

                    {onForgotPassword && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={onForgotPassword}
                                className="text-xs font-semibold text-teal-400 transition hover:text-teal-300"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full rounded-xl bg-teal-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-400"
                    >
                        Login
                    </button>

                    {onGoRegister && (
                        <p className="text-center text-xs text-slate-400">
                            Don&apos;t have an account?{' '}
                            <button type="button" onClick={onGoRegister} className="font-semibold text-teal-400 transition hover:text-teal-300">
                                Register
                            </button>
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
