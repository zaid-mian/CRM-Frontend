import React, { useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

function getCookie(name) {
    return document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`))
        ?.split('=')[1];
}

const initialForm = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    companyLogo: null,
    phoneNumber: '',
    country: '',
    address: '',
    cnic: '',
};

const fieldLabels = {
    fullName: 'Full Name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    companyName: 'Company Name',
    companyLogo: 'Company Logo',
    phoneNumber: 'Phone Number',
    country: 'Country',
    address: 'Address',
    cnic: 'CNIC',
};

const onlyDigits = (value) => value.replace(/\D/g, '');

export default function RegistrationPage({
    onBackToLogin,
    backLabel = '← Already have an account? Login',
    registrationContext,
    reapplyEmail,
}) {
    const [form, setForm] = useState(() => ({
        ...initialForm,
        email: reapplyEmail || '',
    }));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const updateField = (field, value) => {
        if (field === 'email' && reapplyEmail) return;
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const getMissingField = () =>
        Object.entries(form).find(([key, value]) => {
            // Exclude optional companyLogo and address fields from missing check
            if (key === 'companyLogo' || key === 'address') {
                return false;
            }
            if (value instanceof File) {
                return false;
            }

            return String(value || '').trim().length === 0;
        });

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrors({});
        setGeneralError('');

        const missingField = getMissingField();

        if (missingField) {
            alert(
                `Please fill ${fieldLabels[missingField[0]]}.`
            );
            return;
        }

        if (form.password !== form.confirmPassword) {
            alert(
                'Password and Confirm Password must match.'
            );
            return;
        }

        if (form.password.length < 8) {
            alert(
                'Password must be at least 8 characters.'
            );
            return;
        }

        if (
            onlyDigits(form.phoneNumber).length !== 11
        ) {
            alert(
                'Phone Number must be exactly 11 digits.'
            );
            return;
        }

        if (onlyDigits(form.cnic).length !== 13) {
            alert(
                'CNIC must be exactly 13 digits.'
            );
            return;
        }

        // Split Full Name deterministically:
        // FirstName = first word. LastName = all subsequent words.
        const nameParts = form.fullName.trim().split(/\s+/);
        if (nameParts.length < 2 || !nameParts[1]) {
            alert('Please enter your first and last name.');
            setErrors({ last_name: ['Please enter your first and last name.'] });
            return;
        }
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const payload = {
            email: form.email.trim().toLowerCase(),
            password: form.password,
            first_name: firstName,
            last_name: lastName,
            company_name: form.companyName.trim(),
            cnic: onlyDigits(form.cnic),
            phone_number: onlyDigits(form.phoneNumber),
            country: form.country.trim(),
            address: (form.address || '').trim(),
            plan_id: registrationContext?.planId || null
        };

        setIsSubmitting(true);

        try {
            const csrfToken = getCookie('csrftoken');
            const response = await fetch(`${API_BASE_URL}/api/register/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
                },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();

            if (!response.ok || responseData.success === false) {
                if (responseData.errors) {
                    setErrors(responseData.errors);
                    setGeneralError(responseData.message || 'Registration validation failed.');
                } else {
                    setGeneralError(responseData.message || 'Registration failed.');
                }
            } else {
                setIsSuccess(true);
            }
        } catch (err) {
            setGeneralError(err.message || 'Network connection failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <section className="registration-page">
                <div className="registration-page-header">
                    <div>
                        <h1>Registration Pending</h1>
                        <p>Your workspace approval request is under review</p>
                    </div>
                </div>
                <div className="registration-form-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ color: '#16a34a', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                        Workspace Request Submitted Successfully!
                    </div>
                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
                        Your company workspace request has been logged. JTS Administrators will verify your credentials. Once approved, you can log in to your CRM dashboard.
                    </p>
                    <button
                        type="button"
                        onClick={onBackToLogin}
                        className="registration-submit"
                        style={{ maxWidth: '200px', margin: '0 auto' }}
                    >
                        Return to Login
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="registration-page">

            {/* HEADER */}
            <div className="registration-page-header">

                <div className="registration-header-left">

                    {onBackToLogin && (
                        <button
                            type="button"
                            onClick={onBackToLogin}
                            className="registration-back-icon"
                            aria-label="Back"
                        >
                            ←
                        </button>
                    )}

                    <div>
                        <h1>{reapplyEmail ? 'Update & Reapply Workspace Request' : 'Registration'}</h1>

                        <p>
                            {reapplyEmail ? `Reapplying for rejected account: ${reapplyEmail}` : 'Create a company account request'}
                        </p>
                    </div>

                </div>

            </div>

            {/* FORM */}
            <form
                onSubmit={handleSubmit}
                className="registration-form-card"
            >
                {registrationContext && (
                    <div style={{
                        backgroundColor: 'rgba(20, 184, 166, 0.08)',
                        border: '1px solid rgba(20, 184, 166, 0.25)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px'
                    }}>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', tracking: 'wider', color: '#94a3b8' }}>
                            You are signing up for:
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: '800', color: '#14b8a6' }}>
                            {registrationContext.planName ? `${registrationContext.planName} Plan — ` : ''}
                            {registrationContext.productName || registrationContext.serviceName || ''}
                        </p>
                    </div>
                )}

                <div className="registration-form-grid">

                    {/* FULL NAME */}
                    <FormField
                        label="Full Name"
                        value={form.fullName}
                        onChange={(value) =>
                            updateField(
                                'fullName',
                                value
                            )
                        }
                        error={errors.first_name || errors.last_name}
                    />


                    {/* EMAIL */}
                    <FormField
                        label="Email"
                        type="email"
                        value={form.email}
                        onChange={(value) =>
                            updateField(
                                'email',
                                value
                            )
                        }
                        error={errors.email}
                        disabled={!!reapplyEmail}
                    />


                    {/* COMPANY NAME */}
                    <FormField
                        label="Company Name"
                        value={form.companyName}
                        onChange={(value) =>
                            updateField(
                                'companyName',
                                value
                            )
                        }
                        error={errors.company_name}
                    />


                    {/* COMPANY LOGO */}
                    <div className="registration-field">

                        <label>
                            Company Logo (Optional)
                        </label>

                        <div className="registration-file-wrap">

                            <input
                                type="file"
                                accept="image/*"
                                onChange={(event) =>
                                    updateField(
                                        'companyLogo',
                                        event.target.files?.[0] ||
                                        null
                                    )
                                }
                            />

                        </div>

                    </div>


                    {/* PHONE NUMBER */}
                    <FormField
                        label="Phone Number"
                        type="tel"
                        value={form.phoneNumber}
                        onChange={(value) =>
                            updateField(
                                'phoneNumber',
                                onlyDigits(value).slice(
                                    0,
                                    11
                                )
                            )
                        }
                        placeholder="11 digits"
                        error={errors.phone_number}
                    />


                    {/* COUNTRY */}
                    <FormField
                        label="Country"
                        value={form.country}
                        onChange={(value) =>
                            updateField(
                                'country',
                                value
                            )
                        }
                        error={errors.country}
                    />


                    {/* CNIC */}
                    <FormField
                        label="CNIC"
                        value={form.cnic}
                        onChange={(value) =>
                            updateField(
                                'cnic',
                                onlyDigits(value).slice(
                                    0,
                                    13
                                )
                            )
                        }
                        placeholder="13 digits"
                        error={errors.cnic}
                    />


                    {/* ADDRESS */}
                    <div className="registration-field full-width">

                        <label>
                            Address (Optional)
                        </label>

                        <textarea
                            rows="4"
                            value={form.address}
                            onChange={(event) =>
                                updateField(
                                    'address',
                                    event.target.value
                                )
                            }
                            placeholder="Enter company address"
                            style={errors.address ? { borderColor: '#ef4444' } : {}}
                        />
                        {errors.address && (
                            <span style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                {errors.address[0]}
                            </span>
                        )}

                    </div>


                    {/* PASSWORD */}
                    <FormField
                        label="Password"
                        type="password"
                        value={form.password}
                        onChange={(value) =>
                            updateField(
                                'password',
                                value
                            )
                        }
                        placeholder="Minimum 8 characters"
                        className="registration-password-row"
                        error={errors.password}
                    />


                    {/* CONFIRM PASSWORD */}
                    <FormField
                        label="Confirm Password"
                        type="password"
                        value={form.confirmPassword}
                        onChange={(value) =>
                            updateField(
                                'confirmPassword',
                                value
                            )
                        }
                        className="registration-password-row"
                    />

                </div>

                {generalError && (
                    <div className="auth-error" role="alert" style={{ marginBottom: '16px' }}>
                        {generalError}
                    </div>
                )}

                {/* SUBMIT */}
                <button
                    type="submit"
                    className="registration-submit cursor-pointer"
                    disabled={isSubmitting}
                >
                    {isSubmitting 
                        ? (reapplyEmail ? 'Resubmitting Application...' : 'Submitting Registration...') 
                        : (reapplyEmail ? 'Resubmit Application' : 'Register')}
                </button>

            </form>

        </section>
    );
}


/* =========================================================
   REUSABLE FIELD
========================================================= */

function FormField({
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    className = '',
    error,
    disabled = false,
}) {
    return (
        <div
            className={`registration-field ${className}`}
        >

            <label>
                {label}
            </label>

            <input
                type={type}
                value={value}
                onChange={(event) =>
                    onChange(
                        event.target.value
                    )
                }
                placeholder={
                    placeholder || label
                }
                style={error ? { borderColor: '#ef4444' } : {}}
                disabled={disabled}
            />
            {error && (
                <span style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    {error[0]}
                </span>
            )}

        </div>
    );
}
