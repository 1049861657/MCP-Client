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
  static async load(serverId: string): Promise<StoredMcpServerAuth | undefined> {
    const row = await prisma.mCPServerAuth.findUnique({ where: { serverId } });
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

  static async patch(serverId: string, fields: AuthPatch): Promise<void> {
    const current = await this.load(serverId);
    const data = mergeAuth(serverId, current, fields);
    await prisma.mCPServerAuth.upsert({
      where: { serverId },
      create: data as never,
      update: data as never,
    });
  }

  static async saveTokens(serverId: string, tokens: OAuthTokens): Promise<void> {
    await this.patch(serverId, { tokens, expiresAt: computeExpiresAt(tokens) });
  }

  static async delete(serverId: string): Promise<void> {
    await prisma.mCPServerAuth.deleteMany({ where: { serverId } });
  }

  static async deleteExcept(serverIds: string[]): Promise<void> {
    await prisma.mCPServerAuth.deleteMany({
      where: { serverId: { notIn: serverIds } },
    });
  }

  static async findServerIdByOAuthState(oauthState: string): Promise<string | undefined> {
    return (
      await prisma.mCPServerAuth.findFirst({
        where: { oauthState },
        select: { serverId: true },
      })
    )?.serverId;
  }
}
