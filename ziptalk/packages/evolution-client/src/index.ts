/**
 * Wrapper tipado da Evolution API v2.
 * Docs: https://doc.evolution-api.com
 */

export interface EvolutionClientOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export interface CreateInstanceParams {
  instanceName: string;
  webhookUrl?: string;
  webhookEvents?: string[];
  qrcode?: boolean;
}

export interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    status: string;
  };
  hash: { apikey: string };
  qrcode?: { code: string; base64: string };
}

export interface SendTextParams {
  number: string;
  text: string;
  quoted?: { key: { id: string; remoteJid: string; fromMe: boolean } };
  delay?: number;
  linkPreview?: boolean;
}

export interface ConnectionState {
  instance: { instanceName: string; state: "open" | "connecting" | "close" };
}

export class EvolutionClient {
  private baseUrl: string;
  private apiKey: string;
  private fetchImpl: typeof fetch;

  constructor(opts: EvolutionClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new EvolutionError(res.status, errText || res.statusText);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async createInstance(
    params: CreateInstanceParams,
  ): Promise<CreateInstanceResponse> {
    return this.request("POST", "/instance/create", {
      instanceName: params.instanceName,
      qrcode: params.qrcode ?? true,
      integration: "WHATSAPP-BAILEYS",
      webhook: params.webhookUrl
        ? {
            url: params.webhookUrl,
            byEvents: false,
            base64: false,
            events: params.webhookEvents ?? [
              "MESSAGES_UPSERT",
              "CONNECTION_UPDATE",
            ],
          }
        : undefined,
    });
  }

  async deleteInstance(instanceName: string): Promise<void> {
    await this.request("DELETE", `/instance/delete/${instanceName}`);
  }

  async getConnectionState(instanceName: string): Promise<ConnectionState> {
    return this.request("GET", `/instance/connectionState/${instanceName}`);
  }

  async getQrCode(instanceName: string): Promise<{ base64: string }> {
    return this.request("GET", `/instance/connect/${instanceName}`);
  }

  async logout(instanceName: string): Promise<void> {
    await this.request("DELETE", `/instance/logout/${instanceName}`);
  }

  async sendText(instanceName: string, params: SendTextParams): Promise<unknown> {
    return this.request("POST", `/message/sendText/${instanceName}`, params);
  }

  /**
   * Baixa a mídia (áudio) de uma mensagem. Retorna base64.
   */
  async getMediaBase64(
    instanceName: string,
    messageId: string,
  ): Promise<{ base64: string; mimetype: string }> {
    return this.request("POST", `/chat/getBase64FromMediaMessage/${instanceName}`, {
      message: { key: { id: messageId } },
      convertToMp4: false,
    });
  }
}

export class EvolutionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(`Evolution API error ${status}: ${message}`);
    this.name = "EvolutionError";
  }
}
