import React, { useState, useEffect } from 'react';
// 1. Importamos useNavigate para el botón de Editar
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from "../config";

const API_CITAS_CLIENTE =  `${API_BASE_URL}/citas/cliente`;
// 2. Usamos el endpoint de estado que ya existe
const API_UPDATE_ESTADO = `${API_BASE_URL}/citas/estado`; // (PATCH /:id_cita)

function Citas() {
    const usuarioGuardado = localStorage.getItem("usuario");
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    
    const idCliente = usuario?.tipo === 'Cliente' ? usuario.id : null;
    const clienteNombre = usuario?.nombre || "Cliente";

    const [citas, setCitas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('Cargando citas...');
    const [error, setError] = useState(null); // Para mensajes de error de acciones
    
    // 3. Hook de navegación
    const navigate = useNavigate();

    // 4. Estado para deshabilitar botones mientras se cancela
    const [isUpdating, setIsUpdating] = useState(null); // Guardará el ID de la cita que se está actualizando

    useEffect(() => {
        if (!idCliente) {
            setMessage('Debe iniciar sesión como cliente para ver sus citas.');
            setIsLoading(false);
            return;
        }

        const fetchCitasDelCliente = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_CITAS_CLIENTE}/${idCliente}`);
                const data = await response.json();

                if (response.ok) {
                    if (data.citas && data.citas.length > 0) {
                        setCitas(data.citas);
                        setMessage(''); 
                    } else {
                        setCitas([]);
                        setMessage('No tienes citas programadas actualmente. ');
                    }
                } else {
                    setMessage(`Error al cargar las citas: ${data.error || 'Intenta de nuevo.'}`);
                }
            } catch (error) {
                setMessage("Error de conexión con el servidor.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchCitasDelCliente();
    }, [idCliente]); 

    // 5. Nueva Función para CANCELAR una cita
    const handleCancelarCita = async (id_cita) => {
        // Pedir confirmación
        if (!window.confirm("¿Estás seguro de que quieres cancelar esta cita?")) {
            return;
        }

        setIsUpdating(id_cita); // Deshabilitar botones para esta cita
        setError(null);
        setMessage('');

        try {
            const response = await fetch(`${API_UPDATE_ESTADO}/${id_cita}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nuevo_estado: 'CANCELADA' }), // El backend ya sabe qué hacer con esto
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'No se pudo cancelar la cita.');
            }

            // Éxito: Actualizar el estado local sin recargar la página
            setCitas(citasActuales =>
                citasActuales.map(cita =>
                    cita.id_cita === id_cita ? { ...cita, estado: 'CANCELADA' } : cita
                )
            );
            setMessage('Cita cancelada correctamente.');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsUpdating(null); // Reactivar botones
        }
    };
    
    // 6. Nueva Función para EDITAR (redirigir)
    const handleEditarCita = () => {
        alert("Serás redirigido a la página de reservas. Por favor, crea una nueva cita y luego cancela la cita original.");
        navigate("/Reservar");
    };

    
    // --- ESTILOS ---
    // ¡TODAS las constantes de estilo han sido BORRADAS!
    // Ahora usamos clases de styles.css
    
    // Estilos para los botones de acción (ahora usan clases)
    const cancelButtonStyle = "btn-borrar accion-btn";
    const editButtonStyle = "btn-editar accion-btn";


    if (!idCliente && !isLoading) {
        return (
            // Usamos la clase global .citas-container
            <div className="citas-container">
                <h1>Acceso Denegado</h1>
                <p className="mensaje-error">{message}</p>
            </div>
        );
    }

    return (
        // Usamos la clase global .citas-container
        // Mantenemos solo el maxWidth en línea porque es específico de esta página
        <div className="citas-container" style={{ maxWidth: '1200px' }}>
            <h1 style={{ color: '#333', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>
                 Mis Citas | {clienteNombre}
            </h1>

            {isLoading && <p>Cargando...</p>}
            
            {!isLoading && error && <p className="mensaje-error">{error}</p>}
            {!isLoading && message && <p className="mensaje-exito">{message}</p>}

            {!isLoading && citas.length > 0 && (
                // Usamos las clases globales de la tabla de admin
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Hora</th>
                                <th>Personal</th>
                                <th>Servicio</th>
                                <th>Precio</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {citas.map((cita) => (
                                <tr key={cita.id_cita} style={{ 
                                    // Mantenemos este estilo en línea porque es DINÁMICO (cambia con el estado)
                                    backgroundColor: (cita.estado === 'COMPLETADA' || cita.estado === 'CANCELADA') ? '#f9f9f9' : 'white',
                                    textDecoration: cita.estado === 'CANCELADA' ? 'line-through' : 'none',
                                    color: (cita.estado === 'COMPLETADA' || cita.estado === 'CANCELADA') ? '#888' : '#333'
                                }}>
                                    <td>{cita.fecha_cita}</td>
                                    <td>{cita.hora_inicio}</td>
                                    <td>{cita.nombre_personal}</td>
                                    <td>{cita.nombre_servicio}</td>
                                    <td>${parseFloat(cita.precio).toFixed(2)}</td>
                                    <td>
                                        {/* Usamos los Badges de styles.css */}
                                        <span className={`estado-badge estado-${cita.estado.toLowerCase()}`}>
                                            {cita.estado}
                                        </span>
                                    </td>
                                    
                                    <td className="acciones">
                                        {(cita.estado === 'PENDIENTE' || cita.estado === 'CONFIRMADA') ? (
                                            <div>
                                                <button
                                                    className={cancelButtonStyle} // Usamos clase
                                                    onClick={() => handleCancelarCita(cita.id_cita)}
                                                    disabled={isUpdating === cita.id_cita}
                                                    title="Cancelar Cita"
                                                >
                                                    {isUpdating === cita.id_cita ? '...' : '🗑️'}
                                                </button>
                                                {/* AQUÍ ESTÁ LA CORRECCIÓN: Añadido el icono del lápiz */}
                                                <button
                                                    className={editButtonStyle} // Usamos clase
                                                    onClick={handleEditarCita}
                                                    disabled={isUpdating === cita.id_cita}
                                                    title="Reagendar/Editar"
                                                >
                                                    ✏️
                                                </button>
                                            </div>
                                        ) : (
                                            <span>N/A</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Citas;