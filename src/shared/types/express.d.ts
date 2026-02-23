declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "ADMIN" | "USER" | "IT";
        department?: string;
        permissions: string[];
      };
    }
  }
}

export {};
