'use client'
import React from 'react'
import { ArrowLeft } from 'lucide-react'
const BackButton = () => {
    return (
        <button
            onClick={() => window.history.back()}
            className="mb-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center"
        >
            <ArrowLeft />
            Retour
        </button>
    )
}

export default BackButton