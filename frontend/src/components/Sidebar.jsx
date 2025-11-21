// components/Sidebar.jsx
import React from "react";
// ¡No olvides importar el CSS!
//import "./sidebar.css"; 

// Iconos (ejemplo, puedes usar una librería como react-icons)
const ICONS = {
  citas: "",
  clientes: "",
  servicios: "",
  reportes: "",
  horarios: "",
  personal:"",
  logout: ""
};

function Sidebar({ usuario, seccionActiva, onSelectSection, onLogout }) {
  
  // Define qué secciones puede ver cada rol
  const seccionesDisponibles = [
    { id: "citas", nombre: "Citas del Día", roles: ["TRABAJADOR", "ADMIN"] },
    { id: "Editar", nombre: "Editar", roles: ["TRABAJADOR"] },
    { id: "clientes", nombre: "Clientes", roles: ["ADMIN"] },
    { id: "servicios", nombre: "Servicios", roles: ["ADMIN"] },
    { id: "reportes", nombre: "Reportes", roles: ["ADMIN"] },
    { id: "horarios", nombre: "Horarios", roles: ["ADMIN"] },
    { id: "personal", nombre: "Personal", roles: ["ADMIN"] },
  ];

  // --- MEJORA DE SEGURIDAD ---
  // Asignamos el rol del usuario. 
  // La validación en PersonalDashboard ya asegura que 'usuario.rol' existe,
  // por lo que esto es una doble verificación.
  const rolUsuario = usuario.rol; 

  return (
    <aside className="sidebar-container">
      <div className="sidebar-header">
        <h2 className="sidebar-title">BarberStop</h2>
        <span className="sidebar-user">{usuario.nombre}</span>
        {/* Mostramos el rol verificado */}
        <span className="sidebar-role">{rolUsuario}</span>
      </div>

      <nav className="sidebar-nav">
        {seccionesDisponibles.map((seccion) => {
          // Esta línea ahora es segura gracias a la validación
          if (!seccion.roles.includes(rolUsuario)) {
            return null;
          }

          return (
            <button
              key={seccion.id}
              className={`nav-button ${seccionActiva === seccion.id ? "active" : ""}`}
              onClick={() => onSelectSection(seccion.id)}
            >
              <span className="nav-icon">{ICONS[seccion.id]}</span>
              {seccion.nombre}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-button logout-button" onClick={onLogout}>
          <span className="nav-icon">{ICONS.logout}</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
