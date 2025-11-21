import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from "../config";


// Función auxiliar para obtener el endpoint y la clave de ID
const getEndpoints = (rol) => {
    const normalizedRol = rol ? rol.toUpperCase() : null; 

    if (normalizedRol === 'CLIENTE') {
        return {
            updateData: (id) => `${API_BASE_URL}/clientes/${id}`,
            updatePass: `${API_BASE_URL}/clientes/cambiar-contrasena`,
            idKey: 'id_cliente'
        };
    }
    if (normalizedRol === 'TRABAJADOR' || normalizedRol === 'ADMIN') {
        return {
            updateData: (id) => `${API_BASE_URL}/personal/${id}`,
            updatePass: `${API_BASE_URL}/personal/cambiar-contrasena`,
            idKey: 'id_personal'
        };
    }
    return {};
};

function CambiarContra() {
    const navigate = useNavigate();
    const [userId, setUserId] = useState(null);
    const [userRole, setUserRole] = useState(null); 
    const [isLoaded, setIsLoaded] = useState(false);

    // --- Estados para el formulario de Datos (Nombre, Correo) ---
    const [formData, setFormData] = useState({
        nombre: '',
        correo: '',
    });
    const [errorDatos, setErrorDatos] = useState(null);
    const [successDatos, setSuccessDatos] = useState(null);

    // --- Estados para el formulario de Contraseña ---
    const [passData, setPassData] = useState({
        contrasenaActual: '',
        nuevaContrasena: '',
    });
    const [errorPass, setErrorPass] = useState(null);
    const [successPass, setSuccessPass] = useState(null);


    // 1. Cargar datos del usuario al montar y VALIDAR EL ROL
    useEffect(() => {
        const usuarioGuardado = localStorage.getItem("usuario");
        if (!usuarioGuardado) {
            navigate("/Login");
            return;
        }
        
        const user = JSON.parse(usuarioGuardado);
        const userRolValue = user.rol ? user.rol.toUpperCase() : null; 
        const rolesPermitidos = ['CLIENTE', 'TRABAJADOR', 'ADMIN']; 

        if (!user.id || !rolesPermitidos.includes(userRolValue)) {
            navigate("/"); 
            return;
        }
        
        setUserId(user.id);
        setUserRole(user.rol); 
        setFormData({
            nombre: user.nombre || '',
            correo: user.correo || '',
        });
        setIsLoaded(true);
    }, [navigate]);

    // Manejador de cambios para el formulario de Datos
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setSuccessDatos(null);
        setErrorDatos(null);
    };

    // Manejador de cambios para el formulario de Contraseña
    const handlePassChange = (e) => {
        const { name, value } = e.target;
        setPassData(prev => ({ ...prev, [name]: value }));
        setSuccessPass(null);
        setErrorPass(null);
    };

    // --- 2. FUNCIÓN: Actualizar Nombre y Correo ---
    const handleSubmitDatos = async (e) => {
        e.preventDefault();
        
        if (!userId || !userRole) {
            setErrorDatos("Error: ID o Rol de usuario no disponible.");
            return;
        }
        if (!formData.nombre.trim() || !formData.correo.trim()) {
            setErrorDatos("El nombre y el correo no pueden estar vacíos.");
            return;
        }

        setErrorDatos(null);
        setSuccessDatos(null);

        const endpoints = getEndpoints(userRole);
        if (!endpoints.updateData) {
            setErrorDatos("Error: Configuración de endpoint no encontrada para este rol.");
            return;
        }

        try {
            const response = await fetch(endpoints.updateData(userId), { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    nombre: formData.nombre,
                    correo: formData.correo,
                    rol: userRole // Enviamos el rol actual para que no se pierda o cambie
                }) 
            });

            const data = await response.json(); 

            if (!response.ok) {
                throw new Error(data.error || 'Fallo la actualización de datos.');
            }

            // Actualizar localStorage con los nuevos datos
            const usuarioActualizado = JSON.parse(localStorage.getItem("usuario"));
            usuarioActualizado.nombre = formData.nombre;
            usuarioActualizado.correo = formData.correo;
            localStorage.setItem("usuario", JSON.stringify(usuarioActualizado));
            
            setSuccessDatos("Datos actualizados exitosamente.");

        } catch (err) {
            console.error('Error al actualizar datos:', err);
            setErrorDatos(`Fallo la actualización: ${err.message}`);
        }
    };

    // --- 3. FUNCIÓN: Cambiar Contraseña ---
    const handleSubmitContrasena = async (e) => {
        e.preventDefault();

        if (!userId || !userRole) {
            setErrorPass("Error: ID o Rol de usuario no disponible.");
            return;
        }
        // Validación de longitud mínima
        if (passData.nuevaContrasena.length < 8) {
            setErrorPass("La nueva contraseña debe tener al menos 8 caracteres.");
            return;
        }
        if (!passData.contrasenaActual.trim()) {
             setErrorPass("Debes introducir tu contraseña actual.");
            return;
        }

        setErrorPass(null);
        setSuccessPass(null);

        const endpoints = getEndpoints(userRole);
        if (!endpoints.updatePass) {
            setErrorPass("Error: Configuración de endpoint no encontrada para este rol.");
            return;
        }

        const requestBody = {
            [endpoints.idKey]: userId,
            contrasena_actual: passData.contrasenaActual,
            nueva_contrasena: passData.nuevaContrasena
        };

        try {
            const response = await fetch(endpoints.updatePass, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody) 
            });

            const data = await response.json(); 

            if (!response.ok) {
                throw new Error(data.error || 'Fallo el cambio de contraseña.');
            }

            setSuccessPass("Contraseña actualizada exitosamente.");
            
            // Limpiar campos de contraseña después del éxito
            setPassData({ contrasenaActual: '', nuevaContrasena: '' });

        } catch (err) {
            console.error('Error al cambiar contraseña:', err);
            setErrorPass(`Fallo el cambio: ${err.message}`);
        }
    };


    if (!isLoaded) {
        return <div className="admin-manager-container"><p>Cargando datos...</p></div>;
    }

    // --- RENDERIZADO ACTUALIZADO CON DISEÑO DE TARJETAS ---
    return (
        <div className="admin-manager-container"> 
            <h1>Editar Perfil</h1>
            <p>Actualiza tu información personal o fortalece tu seguridad.</p>

            {/* --- 1. Tarjeta de Actualización de Datos --- */}
            <form onSubmit={handleSubmitDatos} className="admin-form"> 
                <h3>Mis Datos</h3>
                
                {errorDatos && <p className="error-message">{errorDatos}</p>}
                {successDatos && <p className="success-message">{successDatos}</p>}
                
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="nombre">Nombre Completo</label>
                        <input 
                            type="text" 
                            id="nombre"
                            name="nombre"
                            value={formData.nombre} 
                            onChange={handleFormChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="correo">Correo Electrónico</label>
                        <input 
                            type="email" 
                            id="correo"
                            name="correo"
                            value={formData.correo} 
                            onChange={handleFormChange}
                            required
                        />
                    </div>
                </div>
                <h3
></h3>
                
                <div className="form-actions">
                    <button type="submit" className="btn-guardar">
                        Guardar Cambios
                    </button>
                </div>
            </form>

            {/* --- 2. Tarjeta de Cambio de Contraseña --- */}
            <form onSubmit={handleSubmitContrasena} className="admin-form">
                <h3>Seguridad</h3>

                {errorPass && <p className="error-message">{errorPass}</p>}
                {successPass && <p className="success-message">{successPass}</p>}
                
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="contrasenaActual">Contraseña Actual</label>
                        <input 
                            type="password" 
                            id="contrasenaActual"
                            name="contrasenaActual"
                            value={passData.contrasenaActual} 
                            onChange={handlePassChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="nuevaContrasena">Nueva Contraseña (mín. 8 caracteres)</label>
                        <input 
                            type="password" 
                            id="nuevaContrasena"
                            name="nuevaContrasena"
                            value={passData.nuevaContrasena} 
                            onChange={handlePassChange}
                            required
                            minLength="8"
                        />
                    </div>
                </div>
<h3></h3>
                <div className="form-actions">
                    <button type="submit" className="btn-editar">
                        Actualizar Contraseña
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CambiarContra;