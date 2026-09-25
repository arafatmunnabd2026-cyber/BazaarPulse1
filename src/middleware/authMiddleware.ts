import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'bazaarpulse-secure-jwt-secret-key-2026';

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'vendor' | 'customer';
  status: 'approved' | 'pending' | 'suspended' | 'rejected' | 'active';
  vendorId?: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

/**
 * 1. JWT Authentication Middleware
 * Extracts Bearer token from header, validates signature, and attaches payload to req.user
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || req.headers.Authorization as string;

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
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
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
 * 2. Admin Verification Middleware
 * Restricts access strictly to users with role === 'admin'
 */
export const verifyAdmin = (req: Request, res: Response, next: NextFunction) => {
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
 * 3. Approved Vendor Verification Middleware
 * Restricts access strictly to users with role === 'vendor' AND status === 'approved'
 */
export const verifyVendor = (req: Request, res: Response, next: NextFunction) => {
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
 * 4. Customer Verification Middleware
 * Restricts access strictly to users with role === 'customer'
 */
export const verifyCustomer = (req: Request, res: Response, next: NextFunction) => {
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
 */
export const requireRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
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
 * Helper to generate JWT Token
 */
export const generateToken = (payload: Partial<AuthUserPayload>, expiresIn: string | number = '7d'): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as any);
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
