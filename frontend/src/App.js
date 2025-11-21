// App.js simplificado
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles.css'; // El nuevo CSS global

// Importa solo lo necesario
import Home from './screens/Home';
import Servicios from './screens/Servicios';
import Contacto from './screens/Contacto';
import Ejemplonavbar from './screens/NavBar';
import Login from './screens/Login';
import Register from './screens/Register';
import Reservar from './screens/Reservar';
import Citas from './screens/Citas'; 
import PersonalDashboard from './screens/PersonalDashboard';
import Perfil from './screens/Perfil';
import RecuperarContra from './components/RecuperarContra';
import CambiarContra from './components/CambiarContra';
import CambiarContraCliente from './screens/CambiarContraCliente';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Ejemplonavbar />}>
          <Route index element={<Home />} /> 
          <Route path="Home" element={<Home />} />
          <Route path="Servicios" element={<Servicios />} />
          <Route path="Contacto" element={<Contacto />} />
          <Route path="Perfil" element={<Perfil />} />
          
          {/* Flujo de Usuario */}
          <Route path="Login" element={<Login />} />
          <Route path="Register" element={<Register />} />
          <Route path="Reservar" element={<Reservar />} />
          <Route path="CambiarContrasena" element={<CambiarContraCliente />} />
          <Route path="Citas" element={<Citas />} /> 
          <Route path="/cambiar-contrasena" element={<CambiarContra />} /> 
          <Route path="RecuperarContra" element={<RecuperarContra />} />
          
        </Route>

        {/* Flujo de Personal */}
        <Route path="/personal/dashboard" element={<PersonalDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;