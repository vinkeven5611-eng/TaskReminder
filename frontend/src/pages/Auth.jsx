import { useState, useEffect } from 'react';
import { authAPI, statsAPI } from '../services/api';
import { Mail, Lock, KeyRound, AlertCircle, ArrowRight, UserPlus, LogIn, Users } from 'lucide-react';

export default function Auth({ setAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ daily: 0, total: 0 });

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
        data = await authAPI.register(email, password);
      }
      
      if (data.status === 'success') {
        localStorage.setItem('taskflow_token', data.token);
        localStorage.setItem('taskflow_username', data.username);
        setAuth(true);
      } else if (data.status === 'pending_verification') {
        setStep(2);
      }
    } catch (err) {
      setError(err.message);
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
      <div className="auth-container" style={{ flex: 1, margin: '5vh auto', MaxWidth: '440px' }}>
        
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
                  type="password" 
                  placeholder="通行密碼" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
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
