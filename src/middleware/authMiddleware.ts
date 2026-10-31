import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 1. JWT_SECRET Check: Fail startup if secret is missing
if (!process.env.JWT_SECRET) {
  console.error('CRITICAL ERROR: JWT_SECRET environment variable is missing.');
  process.exit(1);
}
export const JWT_SECRET = process.env.JWT_SECRET;

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
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
};

/**
 * 2. Admin Verification
 */
export const verifyAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }
  next();
};

/**
 * 3. Approved Vendor Verification
 */
export const verifyVendor = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'vendor' || req.user.status !== 'approved') {
    return res.status(403).json({ message: 'Forbidden: Approved vendor access required' });
  }
  next();
};

/**
 * 4. Customer Verification
 */
export const verifyCustomer = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'customer') {
    return res.status(403).json({ message: 'Forbidden: Customer access required' });
  }
  next();
};

/**
 * 5. Flexible Multi-Role Verification
 */
export const requireRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

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
