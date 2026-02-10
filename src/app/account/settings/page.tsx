'use client';

import CommonButton from '@/app/components/reuseableUI/commonButton';
import EmptyState from '@/app/components/reuseableUI/emptyState';
import Input from '@/app/components/reuseableUI/input';
import LoadingUI from '@/app/components/reuseableUI/loadingUI';
import { PasswordRules } from '@/app/components/reuseableUI/passwordRules/passwordRules';
import { PencilIcon } from '@/app/utils/svgs/pencilIcon';
import { CHANGE_PASSWORD, type ChangePasswordData, type ChangePasswordVars } from '@/graphql/mutations/changePassword';
import { UPDATE_PROFILE, type UpdateProfileData, type UpdateProfileVars } from '@/graphql/mutations/updateProfile';
import { GET_MY_PROFILE, type GetMyProfileData } from '@/graphql/queries/getMyProfile';
import { useMutation, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import EditProfileSuccessModal from './components/editProfileSuccessModal';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function AccountSettingsPage() {
  // Load profile
  const { data, loading, error, refetch } = useQuery<GetMyProfileData>(GET_MY_PROFILE, {
    fetchPolicy: 'no-cache',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // Form data states
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
  });

  useEffect(() => {
    if (data?.me) {
      setProfileData({
        firstName: data.me.firstName || '',
        lastName: data.me.lastName || '',
        email: data.me.email,
      });
    }
  }, [data]);

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [updateProfile, { loading: updatingProfile }] = useMutation<UpdateProfileData, UpdateProfileVars>(UPDATE_PROFILE);
  const [changePassword, { loading: changingPassword }] = useMutation<ChangePasswordData, ChangePasswordVars>(CHANGE_PASSWORD);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let filteredValue = value;
    if (name === "firstName" || name === "lastName") {
      filteredValue = value.replace(/[^A-Za-z ]/g, "");
    } 
    setProfileData({
      ...profileData,
      [name]: filteredValue,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value,
    });
  };

  const editProfileSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await updateProfile({ variables: { firstName: profileData.firstName, lastName: profileData.lastName } });
      const errs = res.data?.accountUpdate?.errors || [];
      if (errs.length) {
        setErrorMessage(errs.map(e => e.message).filter(Boolean).join('\n'));
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }
    } catch (err) {
      console.error('UpdateProfile error', err);
      setErrorMessage('Failed to update profile.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    if (passwordData.currentPassword || passwordData.newPassword || passwordData.confirmPassword) {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setErrorMessage('New passwords do not match!');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }
      try {
        const res2 = await changePassword({ variables: { oldPassword: passwordData.currentPassword, newPassword: passwordData.newPassword } });
        const payload = res2.data?.passwordChange;
        const errs2 = payload?.errors || [];
        if (errs2.length) {
          setErrorMessage(errs2.map(e => e.message).filter(Boolean).join('\n'));
          setTimeout(() => setErrorMessage(''), 3000);
          return;
        }
        // Password changed successfully
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } catch (err) {
        console.error('ChangePassword error', err);
        setErrorMessage('Failed to change password.');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }
    }

    await refetch();
    setIsModalOpen(true);
    setIsEditing(false);
    setTimeout(() => setIsModalOpen(false), 3000);
  }
  return (
    <>
      <div>
        {loading ? (
          <LoadingUI />
        ) : error ? (
          <EmptyState className="h-[50vh]" text="Failed to load profile." />
        ) : (
          <form
            onSubmit={editProfileSubmitHandler}
            className="max-w-4xl space-y-6 lg:space-y-10"
          >
            <div>
              <div className='flex items-center justify-between w-full mb-4 lg:mb-0'>
                <h3 className="text-lg lg:text-xl text-[var(--color-secondary-800)] font-semibold lg:mb-4 uppercase">Personal Information</h3>
                {
                  !isEditing &&
                  <CommonButton type='button' variant='tertiary' className="p-0 text-sm flex items-center gap-2" onClick={() => setIsEditing(true)}>
                    <span className='[&>svg]:size-5 text-[var(--color-primary-600)]'>
                      {PencilIcon}
                    </span>
                    EDIT PROFILE
                  </CommonButton>
                }
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  label="First Name"
                  type="text"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                />
                <Input
                  label="Last Name"
                  type="text"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="mb-2">
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={profileData.email}
                  readOnly
                  disabled
                />
              </div>
            </div>

            <div className='space-y-5'>
              <h3 className="text-lg lg:text-xl text-[var(--color-secondary-800)] font-semibold mb-4">Password</h3>
              <Input
                label="Current Password"
                placeholder='********'
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                disabled={!isEditing}
              />
              {
                isEditing &&
                <>
                  <div className="mb-4 w-full">
                    <Input
                      label="New Password"
                      placeholder='********'
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                    />

                    <div className="mt-2 text-xs space-y-1 [&>div]:flex [&>div]:items-center [&>div]:gap-1">
                      <PasswordRules value={passwordData.newPassword} />
                    </div>
                  </div>
                  <Input
                    label="Re-enter New Password"
                    type="password"
                    name="confirmPassword"
                    placeholder='********'
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                  />
                </>
              }
              {errorMessage && <p className="text-red-600 text-sm font-secondary">{errorMessage}</p>}
            </div>
            {
              isEditing &&
              <div className="flex gap-3">
                <CommonButton
                  type='button'
                  className='min-w-24 text-sm lg:text-base px-4 py-3'
                  variant='secondary'
                  onClick={() => {
                    setIsEditing(false);
                    if (data?.me) {
                      setProfileData({
                        firstName: data.me.firstName || '',
                        lastName: data.me.lastName || '',
                        email: data.me.email,
                      });
                    }
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                >
                  Cancel
                </CommonButton>
                <CommonButton
                  className='min-w-24 text-sm lg:text-base px-4 py-3'
                  variant='primary'
                  type="submit"
                  disabled={updatingProfile || changingPassword}
                >
                  {(updatingProfile || changingPassword) ? 'Updating...' : 'Save'}
                </CommonButton>
              </div>
            }
          </form>
        )}
      </div>
      <div className='relative z-20'>
        <EditProfileSuccessModal isModalOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </>
  );
}
