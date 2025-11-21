import React, { useState } from 'react';
// 1. Importamos useNavigate para el botón de "Volver"
import { useNavigate } from 'react-router-dom';

const RecuperarContra = () => {
    const navigate = useNavigate(); // Hook de navegación

    // (El resto de tus estados permanecen igual)
    const [correo, setCorreo] = useState('');
    const [tokenIngresado, setTokenIngresado] = useState('');
    const [mensaje, setMensaje] = useState({ type: '', text: '' });
    const [cargando, setCargando] = useState(false);
    const [faseRecuperacion, setFaseRecuperacion] = useState('correo');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');

    // (Todas tus funciones handleEnviarCorreo, handleVerificarToken, 
    // y handleCambiarPassword permanecen idénticas)

    // ... (pega aquí tus funciones handleEnviarCorreo, handleVerificarToken, handleCambiarPassword) ...
    
    // --- FUNCIÓN PRINCIPAL: FASE 1 (ENVIAR CORREO) ---
    const handleEnviarCorreo = async (e) => {
        e.preventDefault();
        if (!correo) {
            setMensaje({ type: 'error', text: 'Por favor, ingresa tu correo electrónico.' });
            return;
        }
        setMensaje({ type: '', text: '' });
        setCargando(true);
        const apiUrl = 'http://localhost:3001/api/generar-token';
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo }),
            });
            const data = await response.json();
            if (response.ok) {
                setMensaje({
                    type: 'success',
                    text: data.message || 'Código enviado. ¡Revísalo y continúa!'
                });
                setFaseRecuperacion('token');
            } else {
                setMensaje({
                    type: 'error',
                    text: data.error || 'Ocurrió un error al solicitar el token.'
                });
            }
        } catch (error) {
            setMensaje({
                type: 'error',
                text: 'Error de red. Asegúrate de que tu servidor esté corriendo.'
            });
        } finally {
            setCargando(false);
        }
    };

    // --- FUNCIÓN PRINCIPAL: FASE 2 (VERIFICAR TOKEN) ---
    const handleVerificarToken = async (e) => {
        e.preventDefault();
        if (tokenIngresado.length !== 4) {
            setMensaje({ type: 'error', text: 'El código debe tener exactamente 4 dígitos.' });
            return;
        }
        setMensaje({ type: '', text: '' });
        setCargando(true);
        const apiUrl = 'http://localhost:3001/api/verificar-token';
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, token: tokenIngresado }),
            });
            const data = await response.json();
            if (response.ok) {
                setMensaje({ type: 'success', text: 'Código verificado. Ingresa tu nueva contraseña.' });
                setFaseRecuperacion('password');
            } else {
                setMensaje({ type: 'error', text: data.error || 'Código incorrecto o expirado. Intenta de nuevo.' });
            }
        } catch (error) {
            setMensaje({
                type: 'error',
                text: 'Error de red durante la verificación del token.'
            });
        } finally {
            setCargando(false);
        }
    };

    // --- FUNCIÓN PRINCIPAL: FASE 3 (CAMBIAR CONTRASEÑA) ---
    const handleCambiarPassword = async (e) => {
        e.preventDefault();
        if (nuevaPassword !== confirmarPassword) {
            setMensaje({ type: 'error', text: 'Las contraseñas no coinciden.' });
            return;
        }
        if (nuevaPassword.length < 8) {
            setMensaje({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' });
            return;
        }
        setMensaje({ type: '', text: '' });
        setCargando(true);
        const apiUrl = 'http://localhost:3001/api/restablecer-password';
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, nuevaPassword }),
            });
            const data = await response.json();
            if (response.ok) {
                setMensaje({ type: 'success', text: data.message || '¡Contraseña restablecida exitosamente! Serás redirigido.' });
                setFaseRecuperacion('completado');
                setTimeout(() => {
                    navigate('/Login'); // Redirigir al login
                }, 3000);
            } else {
                setMensaje({ type: 'error', text: data.error || 'Ocurrió un error al restablecer la contraseña.' });
            }
        } catch (error) {
            setMensaje({
                type: 'error',
                text: 'Error de red durante el cambio de contraseña.'
            });
        } finally {
            setCargando(false);
        }
    };


    // --- RENDERIZADO CON ESTILOS ---

    const renderContent = () => {
        // Usamos la clase "agendar-form" de styles.css 
        // para que los labels y inputs se vean bien.
        
        if (faseRecuperacion === 'correo') {
            return (
                <form onSubmit={handleEnviarCorreo} className="agendar-form">
                    <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
                        Ingresa tu correo para recibir un código de recuperación.
                    </p>
                    <label htmlFor="correo">Correo Electrónico:</label>
                    <input
                        type="email"
                        id="correo"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        required
                        disabled={cargando}
                    />
                    <button type="submit" className="login-btn" disabled={cargando}>
                        {cargando ? 'Enviando...' : 'Enviar Código'}
                    </button>
                </form>
            );
        }

        else if (faseRecuperacion === 'token') {
            return (
                <form onSubmit={handleVerificarToken} className="agendar-form">
                    <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
                        Hemos enviado un código a <strong>{correo}</strong>.
                    </p>
                    <label htmlFor="token">Código de 4 Dígitos:</label>
                    <input
                        type="text"
                        id="token"
                        value={tokenIngresado}
                        onChange={(e) => setTokenIngresado(e.target.value)}
                        required
                        maxLength="4"
                        pattern="\d{4}"
                        disabled={cargando}
                        style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '5px' }}
                    />
                    <button type="submit" className="login-btn" disabled={cargando}>
                        {cargando ? 'Verificando...' : 'Verificar Código'}
                    </button>
                    <span 
                        className="login-link" 
                        style={{ textAlign: 'center', marginTop: '15px', display: 'block' }}
                        onClick={() => setFaseRecuperacion('correo')}
                    >
                        Reenviar código
                    </span>
                </form>
            );
        }

        else if (faseRecuperacion === 'password') {
            return (
                <form onSubmit={handleCambiarPassword} className="agendar-form">
                    <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
                        Ingresa y confirma tu nueva contraseña.
                    </p>
                    <label htmlFor="nuevaPassword">Nueva Contraseña (mín. 8 caracteres):</label>
                    <input
                        type="password"
                        id="nuevaPassword"
                        value={nuevaPassword}
                        onChange={(e) => setNuevaPassword(e.target.value)}
                        required
                        minLength="6"
                        disabled={cargando}
                    />
                    <label htmlFor="confirmarPassword">Confirmar Contraseña:</label>
                    <input
                        type="password"
                        id="confirmarPassword"
                        value={confirmarPassword}
                        onChange={(e) => setConfirmarPassword(e.target.value)}
                        required
                        minLength="6"
                        disabled={cargando}
                    />
                    <button type="submit" className="login-btn" disabled={cargando}>
                        {cargando ? 'Cambiando...' : 'Restablecer Contraseña'}
                    </button>
                </form>
            );
        } else if (faseRecuperacion === 'completado') {
             return (
                <div style={{ textAlign: 'center' }}>
                    <h3> Proceso Completado</h3>
                    <p>Serás redirigido al Login en 3 segundos...</p>
                </div>
            );
        }
    };


    return (
        // 2. Usamos la clase "login-container" como contenedor principal
        <div className="login-container">
            {/* 3. Usamos la clase "login-title" para el título */}
            <h1 className="login-title">Recuperar Contraseña</h1>

            {/* 4. Aplicamos clases de mensaje según el tipo */}
            {mensaje.text && (
                <div className={mensaje.type === 'success' ? 'mensaje-exito' : 'mensaje-error'}>
                    {mensaje.text}
                </div>
            )}

            {renderContent()}

            {/* 5. Añadimos un botón para volver al Login */}
            {faseRecuperacion !== 'completado' && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <span 
                        className="login-link" 
                        onClick={() => navigate("/login")}
                    >
                        Volver a Iniciar Sesión
                    </span>
                </div>
            )}
        </div>
    );
};

export default RecuperarContra;