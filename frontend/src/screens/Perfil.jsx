import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import "./Perfil.css" // YA NO ES NECESARIO, usamos styles.css global

const API_BASE_URL = "http://localhost:3001/api"; 

function PerfilCliente() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState(null);
    const [error, setError] = useState(null);

    // 1. Cargar datos del usuario desde localStorage
    useEffect(() => {
        const usuarioGuardado = localStorage.getItem("usuario");
        if (!usuarioGuardado) {
            navigate("/Login");
            return;
        }
        
        const user = JSON.parse(usuarioGuardado);
        
        if (user.tipo !== 'Cliente') {
            navigate("/");
            return;
        }
        
        setUsuario(user);
    }, [navigate]);

    // 2. Función de Logout
    const handleLogout = () => {
        localStorage.removeItem("usuario");
        window.dispatchEvent(new Event("usuario-logout")); 
        navigate("/Home");
    };

    // --- FUNCIÓN: CAMBIAR CONTRASEÑA ---
    const handleCambiarContrasena = () => {
        navigate("/CambiarContrasena"); 
    };

    // --- 3. FUNCIÓN: ELIMINAR CUENTA (SEGURA) ---
    const handleDeleteAccount = async () => {
        if (!usuario || !usuario.id) { 
            setError("Error interno: ID de cliente no disponible. Por favor, reinicie sesión.");
            return;
        }
        
        if (!window.confirm("ADVERTENCIA: ¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es permanente.")) {
            return;
        }

        const correo = prompt("Por favor, introduce tu correo electrónico para confirmar:");
        if (!correo) return; 
        
        const contrasena = prompt("Por favor, introduce tu contraseña actual para confirmar:");
        if (!contrasena) return;

        const id_cliente = usuario.id; 
        setError(null);
        
        try {
            const response = await fetch(`${API_BASE_URL}/clientes/eliminar-cuenta`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_cliente, correo, contrasena }) 
            });

            const data = await response.json(); 

            if (!response.ok) {
                throw new Error(data.error || 'No se pudo completar la eliminación.');
            }

            alert("Tu cuenta ha sido eliminada y archivada exitosamente. ¡Adiós!");
            handleLogout(); 

        } catch (err) {
            console.error('Error al intentar eliminar cuenta:', err);
            setError(`Fallo la eliminación: ${err.message}`);
        }
    };


    if (!usuario) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando perfil...</div>;
    }

    // 4. Renderizado del Perfil (DISEÑO MEJORADO)
    return (
        <div className="perfil-container">
            <h1 className="perfil-title">Mi Perfil</h1>
            
            {error && <p className="mensaje-error">{error}</p>}
            
            <p className="perfil-subtitle">
                Hola, <strong>{usuario.nombre}</strong>. Gestiona tu cuenta y tus citas aquí.
            </p>

            {/* --- Tarjeta de Datos (Usando estilo admin-form para consistencia) --- */}
            <div className="admin-form" style={{ marginBottom: '2rem', borderTop: 'none' }}>
                <h3 style={{ color: 'var(--color-azul-profundo)', borderBottom: '1px solid #eee' }}>
                    Mis Datos Personales
                </h3>
                
                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Nombre:</label>
                    <input 
                        type="text" 
                        value={usuario.nombre} 
                        readOnly 
                        disabled 
                        style={{ backgroundColor: '#f8f9fa', color: '#333', cursor: 'default' }}
                    />
                </div>
                <div className="form-group">
                    <label>Tipo de Cuenta:</label>
                    <div style={{ 
                        padding: '10px', 
                        backgroundColor: '#e6f7ff', 
                        color: '#0056b3', 
                        borderRadius: '4px', 
                        fontWeight: 'bold',
                        border: '1px solid #b8daff'
                    }}>
                        {usuario.tipo}
                    </div>
                </div>
            </div>

            {/* --- Acciones Principales (Grid) --- */}
            <div className="perfil-actions-grid">
                <button 
                    className="btn-editar" // Azul (Estilo Editar/Ver)
                    onClick={() => navigate('/Citas')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    Ver Mis Citas
                </button>
                
                <button 
                    className="btn-guardar" // Rojo (Acción Principal)
                    onClick={() => navigate('/Reservar')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    Agendar Cita
                </button>

                <button 
                    className="btn-cancelar" // Gris (Acción Secundaria)
                    onClick={handleCambiarContrasena}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#495057' }}
                >
                    Cambiar Contraseña
                </button>

                <button 
                    className="btn-cancelar" // Gris (Logout)
                    onClick={handleDeleteAccount}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    Eliminar Mi Cuenta
                </button>
            </div>

            <hr style={{ margin: '25px 0', borderTop: '1px solid #eee' }} />

            {/* --- Zona de Peligro --- */}
            <div style={{ textAlign: 'center' }}>
                <button 
                    className="btn-borrar" 
                    onClick={handleLogout}
                    style={{ width: '100%', opacity: '0.9' }}
                >
                    Cerrar Sesión
                </button>
                <small style={{ display: 'block', marginTop: '10px', color: '#999' }}>
                    Esta acción cancelará todas tus citas futuras y archivará tu cuenta.
                </small>
            </div>
        </div>
    );
}

export default PerfilCliente;