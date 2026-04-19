import React from 'react'

interface PokeButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

const variantClasses = {
  primary: 'bg-pokedex-red hover:bg-pokedex-darkred text-white',
  secondary: 'bg-pokedex-blue hover:bg-blue-700 text-white',
  danger: 'bg-red-700 hover:bg-red-800 text-white',
}

export default function PokeButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  type = 'button',
}: PokeButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 font-mono text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
