'use client'

import { signIn } from 'next-auth/react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-nrlx-bg">
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="font-display text-3xl tracking-[0.4em] text-nrlx-accent">
            NEURALX
          </h1>
          <p className="text-[10px] font-mono text-nrlx-muted tracking-[0.5em] mt-1">
            GLOBAL, INC.
          </p>
          <div className="w-16 h-px bg-nrlx-accent/30 mx-auto mt-6" />
        </div>

        {/* Login card */}
        <div className="bg-nrlx-surface border border-nrlx-border rounded-xl p-8">
          <h2 className="text-sm font-medium text-nrlx-text mb-1">
            Portal de socios
          </h2>
          <p className="text-xs text-nrlx-muted mb-8">
            Inicie sesion con su cuenta corporativa
          </p>

          <button
            onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard' })}
            className="w-full flex items-center justify-center gap-3 bg-nrlx-card hover:bg-nrlx-accent/10 border border-nrlx-border hover:border-nrlx-accent/40 text-nrlx-text py-3 px-4 rounded-lg text-sm transition-all duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
              <rect width="10" height="10" fill="#f25022" />
              <rect x="11" width="10" height="10" fill="#7fba00" />
              <rect y="11" width="10" height="10" fill="#00a4ef" />
              <rect x="11" y="11" width="10" height="10" fill="#ffb900" />
            </svg>
            Iniciar sesion con Microsoft
          </button>

          <p className="text-[10px] font-mono text-nrlx-muted text-center mt-6">
            @neuralxglobal.net
          </p>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-nrlx-muted text-center mt-8">
          NeuralX Global, Inc. — Delaware, USA
        </p>
      </div>
    </div>
  )
}
