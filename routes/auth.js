/**
 * Authentication Routes
 * Rutas para login y registro de usuarios
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const { generateToken } = require('../middleware/auth');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '../config/users.json');

/**
 * Lee usuarios del archivo JSON
 */
async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

/**
 * Escribe usuarios al archivo JSON
 */
async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

/**
 * POST /api/auth/register
 * Registra un nuevo usuario
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, smartcreditEmail, smartcreditPassword } = req.body;

    // Validación
    if (!email || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Email y contraseña son requeridos'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Contraseña débil',
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar si el usuario ya existe
    const users = await readUsers();
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      return res.status(409).json({
        error: 'Usuario existente',
        message: 'Ya existe un usuario con este email'
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear nuevo usuario
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      smartcreditEmail: smartcreditEmail || '',
      smartcreditPassword: smartcreditPassword || '',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await writeUsers(users);

    // Generar token
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        hasSmartcreditCredentials: !!(smartcreditEmail && smartcreditPassword),
      },
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      error: 'Error del servidor',
      message: 'Error al registrar usuario'
    });
  }
});

/**
 * POST /api/auth/login
 * Autentica un usuario
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validación
    if (!email || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario
    const users = await readUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

    // Generar token
    const token = generateToken(user);

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        hasSmartcreditCredentials: !!(user.smartcreditEmail && user.smartcreditPassword),
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error del servidor',
      message: 'Error al autenticar usuario'
    });
  }
});

/**
 * POST /api/auth/update-credentials
 * Actualiza las credenciales de SmartCredit del usuario
 */
router.post('/update-credentials', async (req, res) => {
  try {
    const { email, smartcreditEmail, smartcreditPassword } = req.body;

    if (!email || !smartcreditEmail || !smartcreditPassword) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Todos los campos son requeridos'
      });
    }

    const users = await readUsers();
    const userIndex = users.findIndex(u => u.email === email);

    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró el usuario'
      });
    }

    users[userIndex].smartcreditEmail = smartcreditEmail;
    users[userIndex].smartcreditPassword = smartcreditPassword;
    users[userIndex].updatedAt = new Date().toISOString();

    await writeUsers(users);

    res.json({
      message: 'Credenciales actualizadas exitosamente',
      user: {
        id: users[userIndex].id,
        email: users[userIndex].email,
        hasSmartcreditCredentials: true,
      },
    });
  } catch (error) {
    console.error('Error actualizando credenciales:', error);
    res.status(500).json({
      error: 'Error del servidor',
      message: 'Error al actualizar credenciales'
    });
  }
});

module.exports = router;
