import React, { useEffect, useRef, useState } from 'react';
import {
    ArrowLeft,
    Building2,
    Camera,
    Mail,
    Pencil,
    Phone,
    Trash2,
    UserRound,
    MapPin,
    ShieldCheck,
} from 'lucide-react';

import {
    PrimaryButton,
    SecondaryButton,
    TextInput,
} from './ui';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

function getCookie(name) {
    return document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`))
        ?.split('=')[1];
}

const profileFields = [
    {
        key: 'name',
        label: 'Full Name',
        icon: UserRound,
    },
    {
        key: 'email',
        label: 'Email Address',
        icon: Mail,
    },
    {
        key: 'organization',
        label: 'Organization',
        icon: Building2,
    },
    {
        key: 'phone',
        label: 'Phone Number',
        icon: Phone,
    },
    {
        key: 'address',
        label: 'Address',
        icon: MapPin,
    },
    {
        key: 'cnic',
        label: 'CNIC',
        icon: ShieldCheck,
    },
];

function getInitials(name = '') {
    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) {
        return 'US';
    }

    return parts
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

export default function ProfilePage({
    profile: sharedProfile,
    setCurrentUser,
    onBack,
}) {
    const [profile, setProfile] = useState(sharedProfile);
    const [form, setForm] = useState(sharedProfile);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(!sharedProfile);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState('');

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (sharedProfile) {
            setProfile(sharedProfile);
            setForm(sharedProfile);
            setLoading(false);
        }
    }, [sharedProfile]);

    if (loading) {
        return (
            <section className="profile-page">
                <div className="admin-empty">
                    <strong>Loading profile...</strong>
                </div>
            </section>
        );
    }

    if (!profile) {
        return (
            <section className="profile-page">
                <div className="admin-empty">
                    <strong>Unable to load profile.</strong>
                </div>
            </section>
        );
    }

    const openEditor = () => {
        setForm({
            ...profile,
        });
        setErrors({});
        setGeneralError('');
        setEditing(true);
    };

    const cancelEditor = () => {
        setForm({
            ...profile,
        });
        setErrors({});
        setGeneralError('');
        setEditing(false);
    };

    const updateField = (key, value) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const openProfileImagePicker = () => {
        fileInputRef.current?.click();
    };

    const handleProfileImageChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Profile image must be smaller than 5 MB.');
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            setForm((current) => ({
                ...current,
                profileImage: reader.result,
            }));
        };

        reader.readAsDataURL(file);

        event.target.value = '';
    };

    const removeProfileImage = () => {
        setForm((current) => ({
            ...current,
            profileImage: null,
        }));
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        setErrors({});
        setGeneralError('');
        setIsSaving(true);

        const nameParts = (form.name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const payload = {
            first_name: firstName,
            last_name: lastName,
            phone_number: (form.phone || '').trim(),
            address: (form.address || '').trim()
        };

        try {
            const csrfToken = getCookie('csrftoken');
            const response = await fetch(`${API_BASE_URL}/api/me/`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
                },
                body: JSON.stringify(payload)
            });

            const resData = await response.json();

            if (!response.ok || resData.success === false) {
                if (resData.errors) {
                    setErrors(resData.errors);
                }
                setGeneralError(resData.message || 'Profile update failed.');
            } else {
                // Refresh global session
                const meRes = await fetch(`${API_BASE_URL}/api/me/`, {
                    credentials: 'include'
                });
                const meData = await meRes.json();
                if (meData.success && meData.data) {
                    const userBackendData = meData.data;
                    setCurrentUser({
                        id: userBackendData.id,
                        username: userBackendData.username,
                        email: userBackendData.email,
                        first_name: userBackendData.first_name,
                        last_name: userBackendData.last_name,
                        is_staff: userBackendData.is_staff,
                        is_superuser: userBackendData.is_superuser,
                        user_type: (userBackendData.is_superuser || userBackendData.is_staff) ? 'ADMIN' : 'USER',
                        profile: userBackendData.profile,
                        role: userBackendData.role || null,
                        permissions: userBackendData.permissions || {}
                    });
                }
                setEditing(false);
            }
        } catch (err) {
            setGeneralError(err.message || 'Network connection failed.');
        } finally {
            setIsSaving(false);
        }
    };

    if (editing) {
        return (
            <section className="profile-page">

                <form
                    className="
            admin-form-page
            lead-form-page
            contact-form-page
            profile-edit-page
          "
                    onSubmit={saveProfile}
                >
                    <div className="lead-form-page-card">

                        <header className="admin-page-head">

                            <button
                                type="button"
                                className="lead-form-back"
                                aria-label="Back to profile"
                                onClick={cancelEditor}
                                disabled={isSaving}
                            >
                                <ArrowLeft size={20} />
                            </button>

                            <div>
                                <h2>Edit Profile</h2>

                                <p>
                                    Update your profile photo and personal information,
                                    then save your changes.
                                </p>
                            </div>

                        </header>


                        <section className="profile-photo-edit">

                            <div className="profile-photo-edit-left">

                                <div className="profile-edit-avatar">

                                    {form?.profileImage ? (
                                        <img
                                            src={form.profileImage}
                                            alt={`${form?.name || 'User'} profile`}
                                        />
                                    ) : (
                                        <span>
                                            {getInitials(form?.name)}
                                        </span>
                                    )}

                                </div>

                                <div className="profile-photo-info">

                                    <h3>Profile Photo</h3>

                                    <p>
                                        Upload a JPG, PNG or WebP image.
                                        Maximum file size is 5 MB.
                                    </p>

                                </div>

                            </div>


                            <div className="profile-photo-actions">

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleProfileImageChange}
                                    hidden
                                    disabled={isSaving}
                                />

                                <button
                                    type="button"
                                    className="profile-photo-upload"
                                    onClick={openProfileImagePicker}
                                    disabled={isSaving}
                                >
                                    <Camera size={16} />

                                    {form?.profileImage
                                        ? 'Change Photo'
                                        : 'Upload Photo'}
                                </button>

                                {form?.profileImage && (
                                    <button
                                        type="button"
                                        className="profile-photo-remove"
                                        onClick={removeProfileImage}
                                        disabled={isSaving}
                                    >
                                        <Trash2 size={16} />
                                        Remove
                                    </button>
                                )}

                            </div>

                        </section>


                        {generalError && (
                            <div style={{
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '500',
                                marginBottom: '20px'
                            }} role="alert">
                                {generalError}
                            </div>
                        )}

                        <div className="admin-card form-grid">

                            <div>
                                <TextInput
                                    label="Full Name"
                                    value={form?.name || ''}
                                    onChange={(value) =>
                                        updateField('name', value)
                                    }
                                    required
                                    disabled={isSaving}
                                />
                                <FieldError message={errors.first_name || errors.last_name} />
                            </div>

                            <div>
                                <TextInput
                                    label="Email Address"
                                    type="email"
                                    value={form?.email || ''}
                                    onChange={(value) =>
                                        updateField('email', value)
                                    }
                                    required
                                    disabled={true}
                                />
                            </div>

                            <div>
                                <TextInput
                                    label="Organization"
                                    value={form?.organization || ''}
                                    onChange={(value) =>
                                        updateField('organization', value)
                                    }
                                    disabled={true}
                                />
                            </div>

                            <div>
                                <TextInput
                                    label="Phone Number"
                                    value={form?.phone || ''}
                                    onChange={(value) =>
                                        updateField('phone', value)
                                    }
                                    disabled={isSaving}
                                />
                                <FieldError message={errors.phone_number} />
                            </div>

                            <div className="wide" style={{ gridColumn: 'span 2' }}>
                                <TextInput
                                    label="Address"
                                    value={form?.address || ''}
                                    onChange={(value) =>
                                        updateField('address', value)
                                    }
                                    disabled={isSaving}
                                />
                                <FieldError message={errors.address} />
                            </div>

                            <div>
                                <TextInput
                                    label="CNIC"
                                    value={form?.cnic || ''}
                                    onChange={(value) =>
                                        updateField('cnic', value)
                                    }
                                    disabled={true}
                                />
                            </div>

                        </div>


                        <div className="admin-form-actions">

                            <SecondaryButton
                                type="button"
                                onClick={cancelEditor}
                                disabled={isSaving}
                            >
                                Cancel
                            </SecondaryButton>

                            <PrimaryButton type="submit" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </PrimaryButton>

                        </div>

                    </div>
                </form>

            </section>
        );
    }


    return (
        <section className="profile-page">

            <header className="profile-page-head">

                <div className="profile-page-title-wrap">

                    {onBack && (
                        <button
                            type="button"
                            className="profile-back-button"
                            onClick={onBack}
                            aria-label="Back to dashboard"
                        >
                            <ArrowLeft size={19} />
                        </button>
                    )}

                    <div>
                        <span>Account Settings</span>

                        <h2>Profile</h2>

                        <p>
                            Manage your personal information and company
                            contact details.
                        </p>
                    </div>

                </div>

                <PrimaryButton onClick={openEditor}>
                    <Pencil size={16} />
                    Edit Profile
                </PrimaryButton>

            </header>


            <section className="profile-overview-card">

                <div className="profile-identity">

                    <div className="profile-avatar">

                        {profile.profileImage ? (
                            <img
                                src={profile.profileImage}
                                alt={`${profile.name} profile`}
                            />
                        ) : (
                            getInitials(profile.name)
                        )}

                    </div>

                    <div>
                        <h3>
                            {profile.name || 'User'}
                        </h3>

                        <p>
                            {profile.email || 'No email provided'}
                        </p>

                        <span>
                            {profile.organization ||
                                'No organization provided'}
                        </span>
                    </div>

                </div>


                <div className="profile-overview-meta">

                    <span>
                        Primary Contact
                    </span>

                    <strong>
                        {profile.phone || 'Not provided'}
                    </strong>

                </div>

            </section>


            <section className="profile-details-card">

                <header>
                    <h3>Profile Information</h3>
                </header>

                <div className="profile-details-grid">

                    {profileFields.map(
                        ({
                            key,
                            label,
                            icon: Icon,
                        }) => (
                            <article
                                key={key}
                                className="profile-detail-item"
                            >

                                <span className="profile-detail-icon">
                                    <Icon size={17} />
                                </span>

                                <div>

                                    <span>
                                        {label}
                                    </span>

                                    <strong>
                                        {profile[key] || 'Not provided'}
                                    </strong>

                                </div>

                            </article>
                        )
                    )}

                </div>

            </section>

        </section>
    );
}

function FieldError({ message }) {
  return message ? (
    <span style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'block' }}>
      {Array.isArray(message) ? message[0] : message}
    </span>
  ) : null;
}
