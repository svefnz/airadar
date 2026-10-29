import React from 'react';
import { cn } from '@/lib/utils/cn';

interface BrandLogoProps {
  platformId?: string;
  platformName?: string;
  logoUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BrandLogo({ platformId = '', platformName = '', logoUrl, className, size = 'md' }: BrandLogoProps) {
  const id = platformId.toLowerCase();
  const name = platformName.toLowerCase();

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs rounded-md',
    md: 'w-9 h-9 text-sm rounded-xl',
    lg: 'w-11 h-11 text-base rounded-2xl',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  if (logoUrl) {
    return (
      <div className={cn('relative flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-black/40 shadow-sm', sizeClasses, className)}>
        <img src={logoUrl} alt={platformName} className="h-full w-full object-contain p-1" />
      </div>
    );
  }

  // OpenAI / ChatGPT
  if (id.includes('openai') || name.includes('openai') || id.includes('chatgpt') || name.includes('chatgpt')) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-white text-black shadow-md border border-white/20', sizeClasses, className)} title="OpenAI">
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconSizes}>
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947zm-9.66-4.5244a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4998 4.4998 0 0 1-6.1402-2.0454zm-1.0837-9.5323a4.4755 4.4755 0 0 1 2.3418-1.9729l-.0047.161-4.783 2.7582a.7759.7759 0 0 0-.388.6718v6.7464l-2.02-1.1683a.0899.0899 0 0 1-.038-.052 4.5045 4.5045 0 0 1 4.892-7.1462zm16.5162 5.289l-5.8428-3.3732 2.02-1.1636a.0804.0804 0 0 1 .0615-.0332l4.981 2.8764a4.5045 4.5045 0 0 1 1.0884 6.2065 4.4708 4.4708 0 0 1-2.3087 1.8876zm2.3418-5.3032l-.142-.0852-4.7783-2.7582a.7712.7712 0 0 0-.7854 0L9.809 9.1764V6.844a.0804.0804 0 0 1 .0332-.0615l4.981-2.8764a4.4998 4.4998 0 0 1 6.6748 4.0543v1.8971zm-11.455 3.0374l2.7676-1.6043 2.7723 1.6043v3.2086l-2.7723 1.6043-2.7676-1.6043z" />
        </svg>
      </div>
    );
  }

  // Google / Gemini
  if (id.includes('google') || name.includes('google') || id.includes('gemini') || name.includes('gemini')) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-white shadow-md border border-slate-200/50', sizeClasses, className)} title="Google">
        <svg viewBox="0 0 24 24" className={iconSizes}>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      </div>
    );
  }

  // Anthropic / Claude
  if (id.includes('anthropic') || name.includes('anthropic') || id.includes('claude') || name.includes('claude')) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-[#f5ebe1] text-[#cc785c] font-black shadow-md border border-[#e8d5c4]', sizeClasses, className)} title="Anthropic">
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconSizes}>
          <path d="M13.82 3.5h3.69L24 20.5h-3.69l-1.63-3.8H12.8l-1.63 3.8H7.48L13.82 3.5zm3.17 10.8-2.24-5.24-2.24 5.24h4.48zM3.69 3.5H0l6.52 17h3.69L3.69 3.5z" />
        </svg>
      </div>
    );
  }

  // DeepSeek
  if (id.includes('deepseek') || name.includes('deepseek')) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-[#0d2a4a] text-[#00b4d8] shadow-md border border-[#0096c7]/40', sizeClasses, className)} title="DeepSeek">
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconSizes}>
          <path d="M12 2C6.48 2 2 6.48 2 12c0 3.73 2.05 6.98 5.1 8.68-.13-.76-.23-1.68-.23-2.68 0-4.42 3.58-8 8-8 .89 0 1.74.15 2.54.42C16.51 7.79 14.44 6.5 12 6.5c-3.04 0-5.5 2.46-5.5 5.5 0 .54.08 1.06.23 1.55C4.7 12.3 3.5 10.3 3.5 8c0-4.69 3.81-8.5 8.5-8.5s8.5 3.81 8.5 8.5c0 1.34-.31 2.61-.87 3.73-.2-.58-.51-1.13-.9-1.62.18-.68.27-1.39.27-2.11 0-3.86-3.14-7-7-7z" />
        </svg>
      </div>
    );
  }

  // Qoder
  if (id.includes('qoder') || name.includes('qoder')) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-gradient-to-br from-[#182234] to-[#0f172a] text-emerald-400 font-extrabold shadow-md border border-emerald-500/30', sizeClasses, className)} title="Qoder">
        <span className="font-mono tracking-tighter">Q</span>
      </div>
    );
  }

  // U2 Flash
  if (id.includes('u2-flash') || id.includes('u2') || name.includes('u2 flash')) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-gradient-to-br from-indigo-600 via-sky-500 to-emerald-400 text-white shadow-md border border-white/20', sizeClasses, className)} title="U2 Flash">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={iconSizes}>
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
      </div>
    );
  }

  // Sonus
  if (id.includes('sonus') || name.includes('sonus')) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-white text-black font-black shadow-md border border-slate-300', sizeClasses, className)} title="Sonus">
        <span className="font-mono text-base font-extrabold">S</span>
      </div>
    );
  }

  // Cloudflare
  if (id.includes('cloudflare') || name.includes('cloudflare')) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-[#f38020] text-white shadow-md border border-orange-400/30', sizeClasses, className)} title="Cloudflare">
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconSizes}>
          <path d="M18.8 12.3c-.3-2.1-2.1-3.7-4.3-3.7-1.4 0-2.6.7-3.4 1.7-.6-.3-1.3-.5-2.1-.5-2.2 0-4 1.8-4 4 0 .3 0 .5.1.8-1.8.4-3.1 2-3.1 3.9 0 2.2 1.8 4 4 4h12.5c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-4.2-4.7z" />
        </svg>
      </div>
    );
  }

  // Groq
  if (id.includes('groq') || name.includes('groq')) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-[#f55036] text-white font-black shadow-md border border-red-400/40', sizeClasses, className)} title="Groq">
        <span className="font-bold">G</span>
      </div>
    );
  }

  // Vercel
  if (id.includes('vercel') || name.includes('vercel')) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-black text-white shadow-md border border-white/20', sizeClasses, className)} title="Vercel">
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconSizes}>
          <path d="M12 2L24 22H0L12 2Z" />
        </svg>
      </div>
    );
  }

  // HuggingFace
  if (id.includes('huggingface') || name.includes('hugging face')) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-[#ffd21e] text-black shadow-md border border-yellow-300', sizeClasses, className)} title="HuggingFace">
        <span className="text-base">🤗</span>
      </div>
    );
  }

  // Fallback with clean gradient based on string hash
  const charCode = (id || name || 'A').charCodeAt(0);
  const gradients = [
    'from-blue-600 to-indigo-700 text-white',
    'from-emerald-600 to-teal-700 text-white',
    'from-purple-600 to-pink-700 text-white',
    'from-amber-500 to-orange-600 text-white',
    'from-cyan-600 to-blue-700 text-white',
    'from-rose-600 to-red-700 text-white',
  ];
  const gradient = gradients[charCode % gradients.length];
  const initial = (platformName || platformId || '?').slice(0, 1).toUpperCase();

  return (
    <div className={cn('flex shrink-0 items-center justify-center bg-gradient-to-br font-bold shadow-md border border-white/10', gradient, sizeClasses, className)} title={platformName || platformId}>
      <span>{initial}</span>
    </div>
  );
}
