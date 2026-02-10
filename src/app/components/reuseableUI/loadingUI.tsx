import { cn } from '@/app/utils/functions'
import React from 'react'

const LoadingUI = ({ className, iconSize }: { className?: string, iconSize?: number }) => {
    return (
        <div className={cn("flex items-center justify-center h-[20vh]", className)}>
            <div className={cn("animate-spin rounded-full border-b-2 border-gray-900", iconSize ? iconSize : "size-20")} />
        </div>
    )
}

export default LoadingUI