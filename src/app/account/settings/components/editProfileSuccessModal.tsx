import CommonButton from '@/app/components/reuseableUI/commonButton';
import ModalLayout from '@/app/components/reuseableUI/modalLayout'
import React from 'react'

const EditProfileSuccessModal = ({ isModalOpen, onClose }: { isModalOpen: boolean; onClose: () => void }) => {
    return (
        <ModalLayout isModalOpen={isModalOpen} onClose={onClose} className='max-w-[758px] space-y-5' removeCrossIcon>
            <div className="w-full text-center space-y-1">
                <p className='text-xl font-semibold font-secondary text-[var(--color-secondary-800)]'>
                    PROFILE UPDATED
                </p>
                <p className='text-sm font-secondary text-[var(--color-secondary-600)]'>
                    Your profile has been updated successfully.
                </p>
            </div>
            <CommonButton
                type='button'
                variant='secondary'
                onClick={onClose}
                className='w-full'
            >
                Close
            </CommonButton>
        </ModalLayout>
    )
}

export default EditProfileSuccessModal