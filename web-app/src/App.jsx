import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { 
  Shield, 
  Lock, 
  Key, 
  Send, 
  Eye, 
  Cpu, 
  RefreshCcw,
  User,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SOCKET_URL = 'http://localhost:3000';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [encryptionLogs, setEncryptionLogs] = useState({});
  const [status, setStatus] = useState('offline');
  
  const socketRef = useRef();

  useEffect(() => {
    if (isLoggedIn && user) {
      socketRef.current = io(SOCKET_URL);
      
      socketRef.current.on('connect', () => {
        setStatus('online');
        socketRef.current.emit('user_online', user.userId);
      });

      socketRef.current.on('disconnect', () => {
        setStatus('offline');
      });

      socketRef.current.on('new_message', (message) => {
        setMessages(prev => [message, ...prev]);
      });

      socketRef.current.on('encryption_step', (data) => {
        setEncryptionLogs(prev => ({
          ...prev,
          [data.messageId]: data
        }));
      });

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [isLoggedIn, user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // API Login
      const response = await fetch(`${SOCKET_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passwordHash: password }) // Basitleştirilmiş: Mobil uygulama hash gönderiyor ama biz burada direkt gönderiyoruz (hashleme eklenebilir)
      });
      const data = await response.json();
      if (data.success) {
        setUser(data);
        setIsLoggedIn(true);
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Sunucuya bağlanılamadı');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="login-screen" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '2rem'
      }}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="login-card" 
          style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', width: '400px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Shield size={64} color="#38bdf8" style={{ marginBottom: '1rem' }} />
            <h1 style={{ margin: 0, fontSize: '2rem' }}>SecureChat Web</h1>
            <p style={{ color: '#94a3b8' }}>Şifreleme Görselleştirme Paneli</p>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)}
              style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: 'white' }}
            />
            <input 
              type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)}
              style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: 'white' }}
            />
            <button type="submit" style={{ padding: '1rem', borderRadius: '12px', border: 'none', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}>
              Giriş Yap
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const currentLog = selectedMessage ? encryptionLogs[selectedMessage.messageId] : null;

  return (
    <div className="app-container">
      <div className="sidebar">
        <div style={{ marginBottom: '2rem' }}>
          <h2><Shield size={20} /> SecureChat</h2>
          <div className={status === 'online' ? 'status-online' : 'status-offline'}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
            {status.toUpperCase()}
          </div>
        </div>

        <div className="message-list">
          <h3 style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1rem' }}>Mesaj Akışı</h3>
          {messages.length === 0 && <p style={{ color: '#475569', fontSize: '0.9rem' }}>Henüz mesaj yok...</p>}
          {messages.map((msg) => (
            <div 
              key={msg.messageId} 
              className={`message-item ${selectedMessage?.messageId === msg.messageId ? 'active' : ''}`}
              onClick={() => setSelectedMessage(msg)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{msg.senderId === user.userId ? 'Ben' : 'Karşı Taraf'}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {msg.encryptedMessage.substring(0, 30)}...
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a' }}>
            <User size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{user.displayName}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Web Oturumu Açık</div>
          </div>
        </div>
      </div>

      <div className="main-content">
        {!selectedMessage ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', textAlign: 'center' }}>
            <Zap size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <h3>Şifreleme Detaylarını Görmek İçin<br />Bir Mesaj Seçin</h3>
            <p>Mobil uygulamadan mesaj gönderdiğinizde burada belirecektir.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              key={selectedMessage.messageId}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="encryption-pipeline"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Şifreleme Analizi</h2>
                <span className="badge badge-aes">AES-256-CBC</span>
                <span className="badge badge-rsa">RSA-2048-OAEP</span>
              </div>

              {/* Step 1: Plaintext */}
              <div className="pipeline-step">
                <div className="step-icon"><Eye size={20} /></div>
                <div className="step-content">
                  <div className="step-title">Adım 1: Ham Mesaj (Plaintext)</div>
                  <div className="step-data highlight">{currentLog?.plainText || '?? (Sadece gönderen tarafta görünür)'}</div>
                </div>
              </div>

              {/* Step 2: AES Key */}
              <div className="pipeline-step">
                <div className="step-icon"><Key size={20} /></div>
                <div className="step-content">
                  <div className="step-title">Adım 2: Rastgele AES Anahtarı Üretimi</div>
                  <div className="step-data">{currentLog?.aesKey || 'Anahtar üretiliyor...'}</div>
                </div>
              </div>

              {/* Step 3: AES Encryption */}
              <div className="pipeline-step">
                <div className="step-icon"><Cpu size={20} /></div>
                <div className="step-content">
                  <div className="step-title">Adım 3: AES ile Şifreleme</div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>IV: {selectedMessage.iv}</div>
                  <div className="step-data">{selectedMessage.encryptedMessage}</div>
                </div>
              </div>

              {/* Step 4: RSA Encryption */}
              <div className="pipeline-step">
                <div className="step-icon"><Lock size={20} /></div>
                <div className="step-content">
                  <div className="step-title">Adım 4: AES Anahtarının RSA ile Şifrelenmesi</div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>Alıcının Public Key'i kullanıldı.</div>
                  <div className="step-data">{selectedMessage.encryptedAESKey}</div>
                </div>
              </div>

              {/* Step 5: Final JSON */}
              <div className="pipeline-step">
                <div className="step-icon"><Send size={20} /></div>
                <div className="step-content">
                  <div className="step-title">Adım 5: Sunucuya Gönderilen Paket (JSON)</div>
                  <div className="step-data">
                    {JSON.stringify({
                      messageId: selectedMessage.messageId,
                      encryptedMessage: selectedMessage.encryptedMessage.substring(0, 20) + '...',
                      encryptedAESKey: selectedMessage.encryptedAESKey.substring(0, 20) + '...',
                      iv: selectedMessage.iv,
                      timestamp: selectedMessage.timestamp
                    }, null, 2)}
                  </div>
                </div>
              </div>

            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default App;
