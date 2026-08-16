import React, { useState } from 'react';

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
}) {
    const [form, setForm] = useState(initialForm);

    const updateField = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const getMissingField = () =>
        Object.entries(form).find(([, value]) => {
            if (value instanceof File) {
                return false;
            }

            return String(value || '').trim().length === 0;
        });

    const handleSubmit = (event) => {
        event.preventDefault();

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

        console.log(
            'Registration form payload:',
            form
        );

        alert(
            'Registration request submitted.'
        );
    };

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
                        <h1>Registration</h1>

                        <p>
                            Create a company account request
                        </p>
                    </div>

                </div>

            </div>

            {/* FORM */}
            <form
                onSubmit={handleSubmit}
                className="registration-form-card"
            >

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
                    />


                    {/* COMPANY LOGO */}
                    <div className="registration-field">

                        <label>
                            Company Logo
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
                    />


                    {/* ADDRESS */}
                    <div className="registration-field full-width">

                        <label>
                            Address
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
                        />

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


                {/* SUBMIT */}
                <button
                    type="submit"
                    className="registration-submit"
                >
                    Register
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
            />

        </div>
    );
}
