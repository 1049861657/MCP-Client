import type { Request, Response } from 'express';

const ADMIN_TOKEN_HEADER = 'x-admin-token';

function readConfiguredAdminToken(): string | undefined {
  const token = process.env.ADMIN_API_TOKEN?.trim();
  return token && token.length > 0 ? token : undefined;
}

function readRequestAdminToken(req: Request): string | undefined {
  const header = req.headers[ADMIN_TOKEN_HEADER];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header.trim();
  }
  if (Array.isArray(header) && typeof header[0] === 'string') {
    return header[0].trim();
  }
  return undefined;
}

/** Admin API 鉴权；未通过时已写 401/503 响应，返回 false */
export function assertAdminAuth(req: Request, res: Response): boolean {
  const configured = readConfiguredAdminToken();
  if (!configured) {
    res.status(503).json({
      error: 'Admin API 未配置',
      details: '请设置环境变量 ADMIN_API_TOKEN'
    });
    return false;
  }

  const provided = readRequestAdminToken(req);
  if (provided !== configured) {
    res.status(401).json({
      error: '未授权',
      details: '缺少或无效的 X-Admin-Token'
    });
    return false;
  }

  return true;
}
