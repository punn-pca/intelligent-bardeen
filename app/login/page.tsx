'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/context/AuthContext';
import { useRole } from '@/components/context/RoleContext';
import { saveFirebaseConfig } from '@/lib/firebase';
import { Shield, Lock, Mail, User, LogIn, ArrowRight, AlertCircle, Key, Check, Settings } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, registerWithEmail, loginWithGoogle, authUser, loading } = useAuth();
  const { setCurrentRole } = useRole();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Firebase Config Drawer state
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [customAuthDomain, setCustomAuthDomain] = useState('');
  const [customProjectId, setCustomProjectId] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

  // If already logged in, redirect to home
  if (authUser && !loading) {
    router.push('/');
    return null;
  }

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customApiKey.trim()) return;
    saveFirebaseConfig({
      apiKey: customApiKey.trim(),
      authDomain: customAuthDomain.trim() || 'sb-erp-app.firebaseapp.com',
      projectId: customProjectId.trim() || 'sb-erp-app',
    });
    setConfigSaved(true);
  };

  const handleLocalBypassLogin = (role: string) => {
    setCurrentRole(role);
    router.push('/');
  };

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
      if (
        err.code === 'auth/api-key-not-valid' ||
        err.code === 'auth/invalid-api-key' ||
        err.message?.includes('api-key-not-valid')
      ) {
        msg = 'Firebase API Key ไม่ถูกต้อง หรือยังไม่ได้ตั้งค่า กรุณากรอก Firebase Web API Key จริงด้านล่าง หรือใช้ปุ่ม Local ERP Account';
        setShowConfigDrawer(true);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
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
      let msg = err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google';
      if (
        err.code === 'auth/api-key-not-valid' ||
        err.code === 'auth/invalid-api-key' ||
        err.message?.includes('api-key-not-valid')
      ) {
        msg = 'Firebase API Key ไม่ถูกต้อง หรือยังไม่ได้ตั้งค่า กรุณากรอก Firebase Web API Key จริงด้านล่าง';
        setShowConfigDrawer(true);
      }
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-between items-start">
            <div className="w-8 h-8" />
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Shield className="w-8 h-8" />
            </div>
            <button
              type="button"
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="ตั้งค่า Firebase API Key"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">S&B Enterprise ERP</h1>
          <p className="text-xs text-slate-400">ระบบบริหารจัดการคลังสินค้าและระบบการเงินองค์กร</p>
        </div>

        {/* Firebase Config Drawer */}
        {showConfigDrawer && (
          <form onSubmit={handleSaveFirebaseConfig} className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 space-y-3 text-xs text-white animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between font-bold text-emerald-400">
              <div className="flex items-center gap-1.5">
                <Key className="w-4 h-4" />
                <span>ตั้งค่า Firebase Web API Key</span>
              </div>
              {configSaved && (
                <span className="text-emerald-400 text-[11px] font-mono flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> บันทึกเรียบร้อย!
                </span>
              )}
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Firebase Web API Key (AIzaSy...):</label>
              <input
                type="password"
                required
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="วาง Firebase Web API Key ของคุณ"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Project ID (Optional):</label>
                <input
                  type="text"
                  value={customProjectId}
                  onChange={(e) => setCustomProjectId(e.target.value)}
                  placeholder="sb-erp-app"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Auth Domain (Optional):</label>
                <input
                  type="text"
                  value={customAuthDomain}
                  onChange={(e) => setCustomAuthDomain(e.target.value)}
                  placeholder="sb-erp-app.firebaseapp.com"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>บันทึก Firebase API Key</span>
            </button>
          </form>
        )}

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
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs leading-relaxed flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <span>{errorMsg}</span>
            </div>
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
                <span>{isRegister ? 'สร้างบัญชีผู้ใช้' : 'เข้าสู่ระบบด้วย Firebase'}</span>
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

        {/* Local ERP Account Bypass Option */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 space-y-2">
          <div className="font-semibold text-slate-200 flex items-center justify-between">
            <span>🔑 เข้าใช้งานด้วย Local ERP Account (Dev / Demo Mode):</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { role: 'ADMIN', label: 'Admin', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
              { role: 'MANAGER', label: 'Manager', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
              { role: 'WAREHOUSE', label: 'Warehouse', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
              { role: 'ACCOUNTING', label: 'Accounting', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
              { role: 'USER', label: 'User', color: 'bg-slate-800 text-slate-300 border-slate-700' },
            ].map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => handleLocalBypassLogin(item.role)}
                className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all hover:scale-102 ${item.color}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
