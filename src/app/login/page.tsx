'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [parallax, setParallax] = useState({ x: 50, y: 50 })

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 100
      const y = (event.clientY / window.innerHeight) * 100
      setParallax({ x, y })
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  const bgPosition = `${50 + (parallax.x - 50) * 0.08}% ${50 + (parallax.y - 50) * 0.08}%`

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.84)), url('https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/AdobeStock_1633920749.jpeg')",
        backgroundPosition: bgPosition,
        transition: 'background-position 160ms ease-out',
      }}
    >
      <div className="min-h-screen flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-10">
            <img
              src="https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/Logos_neuralx_cloudfire/Logo_neuralx_letra_blanco.png"
              alt="NeuralX Global"
              className="h-12 md:h-14 w-auto mx-auto object-contain"
            />
            <div className="w-16 h-px bg-nrlx-accent/40 mx-auto mt-5" />
          </div>

          {/* Login card */}
          <div className="max-w-sm mx-auto bg-black/60 border border-white/10 backdrop-blur-sm rounded-xl p-8">
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

          {/* Footer info */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5 text-center md:text-left">
            <div className="rounded-xl border border-white/10 bg-black/45 backdrop-blur-sm px-4 py-3">
              <p className="text-[10px] font-mono tracking-wider text-nrlx-muted mb-2">DIRECCION</p>
              <p className="text-xs text-nrlx-text leading-5">
                10803 NE 7th St
                <br />
                Vancouver, WA 98664
                <br />
                United States
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/45 backdrop-blur-sm px-4 py-3 flex flex-col items-center justify-center">
              <img
                src="https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/Logos_neuralx_cloudfire/icono_neuralx_defense_blanco.png"
                alt="Icono NeuralX"
                className="h-9 w-9 object-contain mb-2"
              />
              <p className="text-xs text-nrlx-text">NeuralX Global Corp</p>
              <p className="text-[10px] text-nrlx-muted mt-1">© 2026 Todos los derechos</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/45 backdrop-blur-sm px-4 py-3">
              <p className="text-[10px] font-mono tracking-wider text-nrlx-muted mb-2">CONTACTO</p>
              <p className="text-xs text-nrlx-text leading-5">
                +52 312 1032746
                <br />
                neuralx@neuralxglobal.net
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
