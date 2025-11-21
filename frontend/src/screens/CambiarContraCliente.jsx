import { useState, useEffect } from 'react'; // Importación limpia de hooks
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from "../config";


function CambiarContraCliente() {
    const navigate = useNavigate();
    const [clienteId, setClienteId] = useState(null);
    const [contrasenaActual, setContrasenaActual] = useState('');
    // 💡 ERROR CORREGIDO: Eliminado el doble '='
    const [nuevaContrasena, setNuevaContrasena] = useState(''); 
    const [confirmarContrasena, setConfirmarContrasena] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [esError, setEsError] = useState(false);

    // 1. Verificar sesión y obtener el ID del cliente
    useEffect(() => {
        const usuarioGuardado = localStorage.getItem("usuario");
        if (!usuarioGuardado) {
            navigate("/Login");
            return;
        }
        
        const user = JSON.parse(usuarioGuardado);
        
        if (user.tipo !== 'Cliente' || !user.id) {
            navigate("/");
            return;
        }
        
        setClienteId(user.id);
    }, [navigate]);


    // 2. Manejar el envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensaje('');
        setEsError(false);

        if (nuevaContrasena.length < 8) {
            setMensaje('La nueva contraseña debe tener al menos 8 caracteres.');
            setEsError(true);
            return;
        }

        if (nuevaContrasena !== confirmarContrasena) {
            setMensaje('Las nuevas contraseñas no coinciden.');
            setEsError(true);
            return;
        }

        if (!clienteId) {
            setMensaje('Error de sesión: ID de cliente no encontrado. Por favor, reinicie sesión.');
            setEsError(true);
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/clientes/cambiar-contrasena`, {
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id_cliente: clienteId, 
                    contrasena_actual: contrasenaActual, 
                    nueva_contrasena: nuevaContrasena 
                }) 
            });

            const data = await response.json();

            if (response.ok) {
                setMensaje(data.mensaje || 'Contraseña cambiada exitosamente.');
                setEsError(false);
                setContrasenaActual('');
                setNuevaContrasena('');
                setConfirmarContrasena('');
            } else {
                setMensaje(data.error || `Fallo al cambiar la contraseña (Error ${response.status}).`);
                setEsError(true);
            }
        } catch (err) {
            console.error('Error de red al cambiar contraseña:', err);
            setMensaje('Error de conexión o del servidor.');
            setEsError(true);
        }
    };

    if (!clienteId) {
        return <div style={{ padding: '20px' }}>Cargando datos de sesión...</div>;
    }

    return (
        <div className="admin-manager-container" style={{ maxWidth: '600px', margin: '3rem auto' }}>
            <h1 style={{ marginBottom: '1rem' }}>🔐 Cambiar Contraseña</h1>
            
            {mensaje && (
                <p className={esError ? "error-message" : "success-message"} style={{marginBottom: '2rem'}}>
                    {mensaje}
                </p>
            )}

            <div className="admin-form" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="actual">Contraseña Actual:</label>
                        <input 
                            id="actual"
                            type="password" 
                            value={contrasenaActual} 
                            onChange={(e) => setContrasenaActual(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="nueva">Nueva Contraseña:</label>
                        <input 
                            id="nueva"
                            type="password" 
                            value={nuevaContrasena} 
                            onChange={(e) => setNuevaContrasena(e.target.value)} 
                            required 
                            minLength="8"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmar">Confirmar Nueva Contraseña:</label>
                        <input 
                            id="confirmar"
                            type="password" 
                            value={confirmarContrasena} 
                            onChange={(e) => setConfirmarContrasena(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn-primary">
                            Guardar Nueva Contraseña
                        </button>
                        <button 
                            type="button" 
                            className="btn-secondary" 
                            onClick={() => navigate('/Perfil')}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CambiarContraCliente;