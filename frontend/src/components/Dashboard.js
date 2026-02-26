import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await api.get('/auth/me');
                setUser(data.data);
            } catch (err) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            await api.post('/auth/logout', { refreshToken });
        } catch (err) {
            // logout even if API fails
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    if (loading) {
        return (
            <div className="auth-page">
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4, borderColor: 'rgba(102,126,234,0.3)', borderTopColor: '#667eea' }} />
            </div>
        );
    }

    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <div className="nav-brand">
                    <div className="logo-sm">🔐</div>
                    <h2>Auth System</h2>
                </div>
                <div className="nav-user">
                    <span>Olá, {user?.name}</span>
                    <button className="btn-logout" onClick={handleLogout}>
                        Sair
                    </button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="welcome-card">
                    <h1>👋 Bem-vindo, {user?.name}!</h1>
                    <p>Você está autenticado no sistema de gerenciamento.</p>

                    <div className="profile-info">
                        <div className="profile-item">
                            <div className="label">Nome</div>
                            <div className="value">{user?.name}</div>
                        </div>
                        <div className="profile-item">
                            <div className="label">Email</div>
                            <div className="value">{user?.email}</div>
                        </div>
                        <div className="profile-item">
                            <div className="label">Função</div>
                            <div className="value" style={{ textTransform: 'capitalize' }}>{user?.role}</div>
                        </div>
                        <div className="profile-item">
                            <div className="label">Membro desde</div>
                            <div className="value">
                                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '—'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
