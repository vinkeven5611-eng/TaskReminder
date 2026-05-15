import { useState, useEffect } from 'react';
import { authAPI, statsAPI } from '../services/api';
import { Mail, Lock, KeyRound, AlertCircle, ArrowRight, UserPlus, LogIn, Users, Eye, EyeOff } from 'lucide-react';

export default function Auth({ setAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [stats, setStats] = useState({ daily: 0, total: 0 });
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('remember_email');
    const savedPassword = localStorage.getItem('remember_password');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    statsAPI.getStats()
      .then(data => setStats({ daily: data.daily_users, total: data.total_users }))
      .catch(err => console.log('Stats Error:', err));
  }, []);

  const handleSubmitAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      let data;
      if (isLogin) {
        data = await authAPI.login(email, password);
      } else {
        if (password !== confirmPassword) {
          throw new Error('兩次輸入的密碼不一致');
        }
        data = await authAPI.register(email, password);
      }
      
      if (data.status === 'success') {
        if (rememberMe) {
          localStorage.setItem('remember_email', email);
          localStorage.setItem('remember_password', password);
        } else {
          localStorage.removeItem('remember_email');
          localStorage.removeItem('remember_password');
        }
        localStorage.setItem('taskflow_token', data.token);
        localStorage.setItem('taskflow_username', data.username);
        setAuth(true);
      } else if (data.status === 'pending_verification') {
        setStep(2);
      }
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('無法連接至伺服器，請確認後端已啟動');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCodeStep = (e) => {
    e.preventDefault();
    if (code.length !== 4) {
      setError('請輸入 4 位數驗證碼');
      return;
    }
    setStep(3);
    setError('');
  };

  const handleFinalVerify = async (skip_2fa) => {
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.verifyCode(email, code, skip_2fa);
      if (data.status === 'success') {
        localStorage.setItem('taskflow_token', data.token);
        localStorage.setItem('taskflow_username', data.username);
        setAuth(true);
      }
    } catch (err) {
      setError(err.message);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="auth-container" style={{ 
        flex: 1, 
        margin: '5vh auto', 
        maxWidth: '440px', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        
        {step === 1 && (
          <div className="fade-in">
            <div className="auth-header">
              <h2>TaskReminder</h2>
              <p>{isLogin ? '重新掌握你的每一天，請登入' : '展開高效生活，建立新帳號'}</p>
            </div>
            
            {error && <div className={`error-msg ${error.includes('success') ? 'success' : ''}`}>
              <AlertCircle size={18} /> {error}
            </div>}
            
            <form className="auth-form" onSubmit={handleSubmitAuth}>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input 
                  type="email" 
                  placeholder="電子信箱" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder={isLogin ? "通行密碼" : "設定通行密碼 (至少 6 位)"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button 
                  type="button" 
                  className="icon-btn" 
                  style={{ position: 'absolute', right: '0.5rem', background: 'transparent', boxShadow: 'none' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!isLogin && (
                <div className="input-wrapper">
                  <KeyRound className="input-icon" size={20} />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="再次確認密碼" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="icon-btn" 
                    style={{ position: 'absolute', right: '0.5rem', background: 'transparent', boxShadow: 'none' }}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}
              
              {isLogin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', cursor: 'pointer' }} onClick={() => setRememberMe(!rememberMe)}>
                  <div style={{ 
                    width: '18px', 
                    height: '18px', 
                    borderRadius: '4px', 
                    border: '1px solid var(--border-active)',
                    background: rememberMe ? 'var(--primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}>
                    {rememberMe && <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '1px' }}></div>}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>記住帳號密碼</span>
                </div>
              )}

              <button type="submit" disabled={loading}>
                {loading ? '處理中...' : (
                  <>
                    {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                    {isLogin ? '登入 TaskReminder' : '註冊帳號'} 
                  </>
                )}
              </button>
            </form>
            
            <div className="auth-switch">
              {isLogin ? "還沒有帳號嗎？" : "已經有帳號了？"}
              <span onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                {isLogin ? '立即註冊' : '登入現有帳號'}
              </span>
            </div>
            
            {!window.Capacitor && (
              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <a href="/TaskFlow.apk" download className="download-app-btn">
                  📱 下載 Android 專屬 App
                </a>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="fade-in delay-1">
            <div className="auth-header">
              <h2>安全驗證</h2>
              <p>我們已將 4 位數驗證碼寄送至您的信箱</p>
            </div>
            
            {error && <div className="error-msg"><AlertCircle size={18} /> {error}</div>}
            
            <form className="auth-form" onSubmit={handleVerifyCodeStep}>
              <div className="input-wrapper">
                <KeyRound className="input-icon" size={20} />
                <input 
                  type="text" 
                  placeholder="請輸入 4 碼" 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={4}
                  style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>
              <button type="submit">
                驗證並繼續 <ArrowRight size={18} />
              </button>
              <button type="button" className="secondary" onClick={() => setStep(1)}>
                返回上一頁
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in delay-2">
            <div className="auth-header">
              <h2>信任此裝置？</h2>
              <p>日後不再要求驗證，直接登入</p>
            </div>
            
            {error && <div className="error-msg"><AlertCircle size={18} /> {error}</div>}
            
            <div className="auth-form prompt-buttons">
              <button onClick={() => handleFinalVerify(true)} disabled={loading}>
                {loading ? '處理中...' : '是，不再驗證'}
              </button>
              <button onClick={() => handleFinalVerify(false)} disabled={loading} className="secondary">
                {loading ? '處理中...' : '否，維持驗證'}
              </button>
            </div>
          </div>
        )}

      </div>

      <div style={{
        marginTop: 'auto',
        padding: '2rem 1rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        opacity: 0.6
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={14} /> 總註冊人數：{stats.total} 位</span>
        <span>•</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', display: 'inline-block'}}></span> 今日活耀：{stats.daily} 位</span>
      </div>
    </div>
  );
}
