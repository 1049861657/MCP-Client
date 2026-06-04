import { randomBytes } from 'node:crypto';
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from '@modelcontextprotocol/sdk/client/auth.js';
import {
  auth,
  discoverOAuthServerInfo,
  refreshAuthorization,
  UnauthorizedError,
} from '@modelcontextprotocol/sdk/client/auth.js';
import { MCPClientIdentity, McpOAuthConfig, ServerConfig } from '../../config/app.config.js';
import { McpServerAuthService } from '../../services/mcp-server-auth.service.js';
import { Logger } from '../../utils/logger.js';

const pendingAuthorizationUrls = new Map<string, string>();

function oauthRedirectUrl(): string {
  return (
    process.env.MCP_OAUTH_REDIRECT_URL?.trim() ||
    `http://${ServerConfig.host}:${ServerConfig.port}${McpOAuthConfig.callbackPath}`
  );
}

export class McpOAuthProvider implements OAuthClientProvider {
  private readonly redirectUrlValue = oauthRedirectUrl();

  constructor(private readonly serverId: string) {}

  get redirectUrl(): string {
    return this.redirectUrlValue;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: MCPClientIdentity.name,
      redirect_uris: [this.redirectUrlValue],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    };
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    return (await McpServerAuthService.load(this.serverId))?.clientInfo;
  }

  async saveClientInformation(clientInformation: OAuthClientInformationMixed): Promise<void> {
    await McpServerAuthService.patch(this.serverId, { clientInfo: clientInformation });
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    return (await McpServerAuthService.load(this.serverId))?.tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    await McpServerAuthService.saveTokens(this.serverId, tokens);
    pendingAuthorizationUrls.delete(this.serverId);
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    pendingAuthorizationUrls.set(this.serverId, authorizationUrl.toString());
    Logger.info('MCP OAUTH', `[${this.serverId}] 等待浏览器授权: ${authorizationUrl}`);
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await McpServerAuthService.patch(this.serverId, { codeVerifier });
  }

  async codeVerifier(): Promise<string> {
    const verifier = (await McpServerAuthService.load(this.serverId))?.codeVerifier;
    if (!verifier) {
      throw new Error(`缺少 PKCE code_verifier: ${this.serverId}`);
    }
    return verifier;
  }

  async state(): Promise<string> {
    const value = `${this.serverId}:${randomBytes(16).toString('hex')}`;
    await McpServerAuthService.patch(this.serverId, { oauthState: value });
    return value;
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    await McpServerAuthService.patch(this.serverId, { discoveryState: state });
  }

  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    return (await McpServerAuthService.load(this.serverId))?.discoveryState;
  }

  async invalidateCredentials(
    _scope?: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery'
  ): Promise<void> {
    pendingAuthorizationUrls.delete(this.serverId);
    await McpServerAuthService.delete(this.serverId);
  }
}

export function getPendingAuthorizationUrl(serverId: string): string | undefined {
  return pendingAuthorizationUrls.get(serverId);
}

export function shouldUseMcpOAuth(
  connectionType: string,
  headers: Record<string, string> | undefined
): boolean {
  return connectionType === 'HTTP' && !(headers && Object.keys(headers).length > 0);
}

export async function exchangeMcpOAuthCode(
  serverId: string,
  mcpUrl: string,
  authorizationCode: string
): Promise<void> {
  const provider = new McpOAuthProvider(serverId);
  const result = await auth(provider, {
    serverUrl: mcpUrl,
    authorizationCode,
  });
  if (result !== 'AUTHORIZED') {
    throw new UnauthorizedError('OAuth 授权未完成');
  }
}

export async function refreshMcpOAuthTokens(serverId: string, mcpUrl: string): Promise<boolean> {
  const stored = await McpServerAuthService.load(serverId);
  if (!stored?.tokens?.refresh_token || !stored.clientInfo) {
    return false;
  }

  try {
    const discovery = stored.discoveryState ?? (await discoverOAuthServerInfo(mcpUrl));
    const newTokens = await refreshAuthorization(discovery.authorizationServerUrl, {
      metadata: discovery.authorizationServerMetadata,
      clientInformation: stored.clientInfo,
      refreshToken: stored.tokens.refresh_token,
    });
    await McpServerAuthService.saveTokens(serverId, newTokens);
    Logger.info('MCP OAUTH', `[${serverId}] refresh token 成功`);
    return true;
  } catch (error) {
    Logger.warn(
      'MCP OAUTH',
      `[${serverId}] refresh token 失败: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

export async function clearMcpServerAuth(serverId: string): Promise<void> {
  pendingAuthorizationUrls.delete(serverId);
  await McpServerAuthService.delete(serverId);
}
