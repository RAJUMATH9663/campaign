export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface SMSProvider {
  name: string;
  sendMessage(to: string, message: string): Promise<SendResult>;
}
