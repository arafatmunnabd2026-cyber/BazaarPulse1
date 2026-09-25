/**
 * BazaarPulse Role-Based Access Control (RBAC) & Authentication Middleware
 * Production-ready JWT authentication and role verification for Express.
 */

import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'bazaarpulse-secure-jwt-secret-key-2026';

/**
 * 1. JWT Authentication Middleware
 * Extracts the Bearer token from the Authorization header, verifies it,
 * and attaches the decoded user payload (id, email, role, status, vendorId) to req.user.
 */
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Access denied. No authorization token provided.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ 
      error: 'Access denied. Token format must be: Bearer <token>',
      code: 'AUTH_FORMAT_INVALID'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Authentication token has expired. Please log in again.',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    }
    return res.status(403).json({ 
      error: 'Invalid or forged authentication token.',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
};

/**
 * 2. Role Verification: Admin Only
 * Restricts access strictly to authenticated users with role === 'admin'.
 */
export const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ 
    error: 'Access denied. Admins only.',
    code: 'FORBIDDEN_ADMIN_ONLY',
    requiredRole: 'admin',
    currentRole: req.user?.role || 'unauthenticated'
  });
};

/**
 * 3. Role Verification: Approved Vendor Only
 * Restricts access strictly to users with role === 'vendor' AND status === 'approved'.
 */
export const verifyVendor = (req, res, next) => {
  if (req.user && req.user.role === 'vendor' && req.user.status === 'approved') {
    return next();
  }

  if (req.user && req.user.role === 'vendor' && req.user.status !== 'approved') {
    return res.status(403).json({ 
      error: `Access denied. Vendor account is currently ${req.user.status}. Only approved vendors can perform this action.`,
      code: 'FORBIDDEN_VENDOR_NOT_APPROVED',
      vendorStatus: req.user.status
    });
  }

  return res.status(403).json({ 
    error: 'Access denied. Approved vendors only.',
    code: 'FORBIDDEN_VENDOR_ONLY',
    requiredRole: 'vendor (approved)',
    currentRole: req.user?.role || 'unauthenticated'
  });
};

/**
 * 4. Role Verification: Customer
 * Restricts access strictly to users with role === 'customer'.
 */
export const verifyCustomer = (req, res, next) => {
  if (req.user && req.user.role === 'customer') {
    return next();
  }
  return res.status(403).json({ 
    error: 'Access denied. Customers only.',
    code: 'FORBIDDEN_CUSTOMER_ONLY',
    requiredRole: 'customer',
    currentRole: req.user?.role || 'unauthenticated'
  });
};

/**
 * 5. Flexible Multi-Role Verification Utility
 * Allows any user matching one of the permitted roles.
 */
export const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (allowedRoles.includes(req.user.role)) {
      if (req.user.role === 'vendor' && req.user.status !== 'approved') {
        return res.status(403).json({ 
          error: 'Access denied. Vendor account must be approved.',
          code: 'FORBIDDEN_VENDOR_NOT_APPROVED'
        });
      }
      return next();
    }
    return res.status(403).json({ 
      error: `Access denied. Requires one of: ${allowedRoles.join(', ')}`,
      code: 'FORBIDDEN_INSUFFICIENT_ROLE'
    });
  };
};

/**
 * Helper to generate signed JWT tokens
 */
export const generateToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export default {
  authMiddleware,
  verifyAdmin,
  verifyVendor,
  verifyCustomer,
  requireRoles,
  generateToken,
  JWT_SECRET
};
