'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/context/AuthContext';
import { Shield, Lock, Mail, User, LogIn, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, registerWithEmail, loginWithGoogle, authUser, loading } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to home
  if (authUser && !loading) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('กรุณาระบุชื่อ-นามสกุล');
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
      router.push('/');
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'อีเมลนี้ถูกใช้งานในระบบแล้ว';
      } else if (err.code === 'auth/weak-password') {
        msg = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      }
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      await loginWithGoogle();
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 mb-2">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">S&B Enterprise ERP</h1>
          <p className="text-xs text-slate-400">ระบบบริหารจัดการคลังสินค้าและระบบการเงินองค์กร</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              !isRegister ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            เข้าสู่ระบบ (Login)
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              isRegister ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            ลงทะเบียน (Register)
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">ชื่อ-นามสกุล</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="สมชาย ใจดี"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">อีเมล (Email)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@sb-electronic.co.th"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">รหัสผ่าน (Password)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/50"
          >
            {submitting ? (
              <span>กำลังดำเนินการ...</span>
            ) : (
              <>
                <span>{isRegister ? 'สร้างบัญชีผู้ใช้' : 'เข้าสู่ระบบ'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider absolute">หรือ</span>
        </div>

        {/* Google Sign-in */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={submitting}
          className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
            />
          </svg>
          <span>เข้าสู่ระบบด้วย Google Account</span>
        </button>

        <p className="text-[11px] text-center text-slate-500">
          ระบบความปลอดภัยควบคุมสิทธิ์ RBAC ตามนโยบาย FIRE KEEPER Governance
        </p>
      </div>
    </div>
  );
}
