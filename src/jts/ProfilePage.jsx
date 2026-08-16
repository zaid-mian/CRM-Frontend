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
} from 'lucide-react';

import { fetchUserDashboard } from '../data/jts/userDashboardApi';
import {
    PrimaryButton,
    SecondaryButton,
    TextInput,
} from './ui';

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
    onProfileUpdate,
    onBack,
}) {
    const [profile, setProfile] = useState(sharedProfile);
    const [form, setForm] = useState(sharedProfile);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(!sharedProfile);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (sharedProfile) {
            setProfile(sharedProfile);
            setForm(sharedProfile);
            setLoading(false);
            return;
        }

        setLoading(true);

        fetchUserDashboard()
            .then((data) => {
                const user = data?.user;

                if (!user) return;

                setProfile(user);
                setForm(user);
                onProfileUpdate?.(user);
            })
            .catch((error) => {
                console.error('Failed to load profile:', error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [sharedProfile, onProfileUpdate]);

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

        setEditing(true);
    };

    const cancelEditor = () => {
        setForm({
            ...profile,
        });

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

    const saveProfile = (event) => {
        event.preventDefault();

        const nextProfile = {
            ...profile,

            name: form?.name?.trim() || '',
            email: form?.email?.trim() || '',
            organization: form?.organization?.trim() || '',
            phone: form?.phone?.trim() || '',

            profileImage: form?.profileImage || null,
        };

        setProfile(nextProfile);
        setForm(nextProfile);

        onProfileUpdate?.(nextProfile);

        setEditing(false);
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
                                />

                                <button
                                    type="button"
                                    className="profile-photo-upload"
                                    onClick={openProfileImagePicker}
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
                                    >
                                        <Trash2 size={16} />
                                        Remove
                                    </button>
                                )}

                            </div>

                        </section>


                        <div className="admin-card form-grid">

                            <TextInput
                                label="Full Name"
                                value={form?.name || ''}
                                onChange={(value) =>
                                    updateField('name', value)
                                }
                                required
                            />

                            <TextInput
                                label="Email Address"
                                type="email"
                                value={form?.email || ''}
                                onChange={(value) =>
                                    updateField('email', value)
                                }
                                required
                            />

                            <TextInput
                                label="Organization"
                                value={form?.organization || ''}
                                onChange={(value) =>
                                    updateField('organization', value)
                                }
                            />

                            <TextInput
                                label="Phone Number"
                                value={form?.phone || ''}
                                onChange={(value) =>
                                    updateField('phone', value)
                                }
                            />

                        </div>


                        <div className="admin-form-actions">

                            <SecondaryButton
                                type="button"
                                onClick={cancelEditor}
                            >
                                Cancel
                            </SecondaryButton>

                            <PrimaryButton type="submit">
                                Save Changes
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
