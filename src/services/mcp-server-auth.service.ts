import type {
  OAuthClientInformationMixed,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type { OAuthDiscoveryState } from '@modelcontextprotocol/sdk/client/auth.js';
import { prisma } from '../lib/prisma.js';

export type StoredMcpServerAuth = {
  serverId: string;
  tokens?: OAuthTokens;
  expiresAt?: Date;
  clientInfo?: OAuthClientInformationMixed;
  codeVerifier?: string;
  discoveryState?: OAuthDiscoveryState;
  oauthState?: string;
};

type AuthPatch = Partial<Omit<StoredMcpServerAuth, 'serverId'>>;

function computeExpiresAt(tokens: OAuthTokens): Date | undefined {
  if (typeof tokens.expires_in !== 'number' || tokens.expires_in <= 0) {
    return undefined;
  }
  return new Date(Date.now() + tokens.expires_in * 1000);
}

function mergeAuth(serverId: string, current: StoredMcpServerAuth | undefined, patch: AuthPatch) {
  const tokens = patch.tokens !== undefined ? patch.tokens : current?.tokens;
  return {
    serverId,
    tokens,
    expiresAt:
      patch.expiresAt !== undefined
        ? patch.expiresAt
        : patch.tokens
          ? computeExpiresAt(patch.tokens)
          : current?.expiresAt,
    clientInfo: patch.clientInfo !== undefined ? patch.clientInfo : current?.clientInfo,
    codeVerifier: patch.codeVerifier !== undefined ? patch.codeVerifier : current?.codeVerifier,
    discoveryState:
      patch.discoveryState !== undefined ? patch.discoveryState : current?.discoveryState,
    oauthState: patch.oauthState !== undefined ? patch.oauthState : current?.oauthState,
  };
}

export class McpServerAuthService {
  // T4-06-01: MCPServerAuth PK 改为 id，通过 @@unique([userId, serverId]) 查找
  static async load(serverId: string, userId?: string): Promise<StoredMcpServerAuth | undefined> {
    const resolvedUserId = userId ?? null;
    const row = await prisma.mCPServerAuth.findFirst({ where: { userId: resolvedUserId, serverId } });
    if (!row) {
      return undefined;
    }
    return {
      serverId: row.serverId,
      tokens: (row.tokens as OAuthTokens | null) ?? undefined,
      expiresAt: row.expiresAt ?? undefined,
      clientInfo: (row.clientInfo as OAuthClientInformationMixed | null) ?? undefined,
      codeVerifier: row.codeVerifier ?? undefined,
      discoveryState: (row.discoveryState as OAuthDiscoveryState | null) ?? undefined,
      oauthState: row.oauthState ?? undefined,
    };
  }

  static async patch(serverId: string, fields: AuthPatch, userId?: string): Promise<void> {
    const resolvedUserId = userId ?? null;
    const current = await this.load(serverId, userId);
    const data = mergeAuth(serverId, current, fields);
    // Prisma compound unique input 不接受 null，用 findFirst + create/update
    const existing = await prisma.mCPServerAuth.findFirst({ where: { userId: resolvedUserId, serverId } });
    if (existing) {
      await prisma.mCPServerAuth.update({ where: { id: existing.id }, data: data as never });
    } else {
      await prisma.mCPServerAuth.create({ data: { ...data, userId: resolvedUserId } as never });
    }
  }

  static async saveTokens(serverId: string, tokens: OAuthTokens, userId?: string): Promise<void> {
    await this.patch(serverId, { tokens, expiresAt: computeExpiresAt(tokens) }, userId);
  }

  static async delete(serverId: string, userId?: string): Promise<void> {
    const resolvedUserId = userId ?? null;
    await prisma.mCPServerAuth.deleteMany({ where: { userId: resolvedUserId, serverId } });
  }

  static async deleteExcept(serverIds: string[], userId?: string): Promise<void> {
    const resolvedUserId = userId ?? null;
    await prisma.mCPServerAuth.deleteMany({
      where: { userId: resolvedUserId, serverId: { notIn: serverIds } },
    });
  }

  /** OAuth 回调无会话：按 state 反查配置桶与 serverId */
  static async findOAuthContextByState(
    oauthState: string
  ): Promise<{ serverId: string; userId: string | null } | undefined> {
    const row = await prisma.mCPServerAuth.findFirst({
      where: { oauthState },
      select: { serverId: true, userId: true },
    });
    if (!row) {
      return undefined;
    }
    return { serverId: row.serverId, userId: row.userId };
  }
}
