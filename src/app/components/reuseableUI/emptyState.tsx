import { cn } from '@/app/utils/functions'
import { NoProductFoundIcon } from '@/app/utils/svgs/noProductFoundIcon'
import React from 'react'
import CommonButton from './commonButton'

const EmptyState = ({ text, textParagraph, className, buttonLabel, buttonVariant, icon, onClick, iconContainer }: { text: string, textParagraph?: string, className?: string, buttonLabel?: string, buttonVariant?: "primary" | "secondary" | "tertiary" | "tertiarySecondary", icon?: React.ReactNode, onClick?: () => void, iconContainer?: string }) => {
    return (
        <div className={cn("flex items-center justify-center h-[20vh] flex-col gap-6 text-gray-600", className)}>
            <div className='space-y-4 flex flex-col items-center'>
                <div className={cn("p-7 rounded-full border border-[var(--color-secondary-300)] bg-[var(--color-secondary-300)] w-fit", iconContainer)}>
                    <span className="size-24">{icon ? icon : NoProductFoundIcon}</span>
                </div>
                <div className='space-y-2 text-[var(--color-secondary-75)] font-secondary text-center'>
                    <p className='font-semibold text-xl '>{text}</p>
                    {textParagraph && <p className='font-normal text-sm'>{textParagraph}</p>}
                </div>
            </div>
            {buttonLabel && (
                <CommonButton
                    onClick={onClick}
                    content={buttonLabel}
                    variant={buttonVariant ? buttonVariant : "primary"}
                />
            )}
        </div>
    )
}

export default EmptyState