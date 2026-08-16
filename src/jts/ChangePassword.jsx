// File: src/components/ChangePassword.jsx
import React, { useState } from 'react';

export default function ChangePassword({ onComplete }) {
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmNewPassword) {
            alert("Validation Alert: New passwords do not match.");
            return;
        }
        console.log("Sending credential update payload:", passwords);
        alert("Your password has been successfully configured!");
        onComplete();
    };

    return (
        <div className="max-w-md mx-auto my-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 text-slate-100">
            <div className="text-center space-y-2">
                <h4 className="text-2xl font-bold tracking-tight text-white">Change Password</h4>
                <p className="text-xs text-slate-400">Update credentials to secure your active portal session</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Current Password
                    </label>
                    <input
                        required
                        type="password"
                        value={passwords.currentPassword}
                        onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition"
                        placeholder="••••••••"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        New Password
                    </label>
                    <input
                        required
                        type="password"
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition"
                        placeholder="Minimum 8 characters"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Confirm New Password
                    </label>
                    <input
                        required
                        type="password"
                        value={passwords.confirmNewPassword}
                        onChange={(e) => setPasswords({ ...passwords, confirmNewPassword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition"
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl font-bold transition text-sm shadow-lg shadow-teal-500/10"
                >
                    Confirm Password Change
                </button>
            </form>
        </div>
    );
}
