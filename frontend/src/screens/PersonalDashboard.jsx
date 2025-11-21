import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// Asegúrate de que esta ruta sea correcta
import Sidebar from "../components/Sidebar"; 
import DashboardContent from "../components/DashboardContent";
// ¡No olvides importar el CSS!
//import "./personaldashboard.css"; 

function PersonalDashboard() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState("citas");

  // 1. Verificar la sesión al cargar el dashboard
  useEffect(() => {
    const sesionUsuario = localStorage.getItem("usuario");
    if (!sesionUsuario) {
      // Si no hay sesión, redirigir al login
      navigate("/Login");
      return;
    }

    const user = JSON.parse(sesionUsuario);
    
    // Esta validación está bien
    if (user.tipo !== 'Personal' || !user.rol) {
      // Si es Personal pero no tiene rol
      alert("Acceso denegado. Su usuario no tiene un ROL asignado. Contacte al administrador.");
      localStorage.removeItem("usuario"); 
      navigate("/Login");
    } else {
      // Si todo está bien, establecemos el usuario
      setUsuario(user);
    }
  }, [navigate]); // El 'navigate' es una dependencia de useEffect

  // Función de Logout
  const handleLogout = () => {
    localStorage.removeItem("usuario");
    // Disparamos el evento para que SesionEstado.jsx se actualice
    window.dispatchEvent(new CustomEvent("usuario-logout")); 
    navigate("/Login");
  };

  // Mientras se verifica el usuario, mostramos un 'Cargando...'
  if (!usuario) {
    return <div className="dashboard-loading">Verificando sesión...</div>;
  }

  // Si el usuario es verificado, renderizamos el layout del dashboard
  return (
    <div className="dashboard-layout">
      {/* Barra lateral de navegación */}
      <Sidebar 
        usuario={usuario}
        seccionActiva={seccionActiva}
        onSelectSection={setSeccionActiva} // Pasamos la función para cambiar de sección
        onLogout={handleLogout}
      />
      
      {/* Área principal de contenido */}
      <div className="main-content-area">
        {/* Este componente renderizará el contenido según la 'seccionActiva' */}
        <DashboardContent seccion={seccionActiva} usuario={usuario} />
      </div>
    </div>
  );
}

export default PersonalDashboard;