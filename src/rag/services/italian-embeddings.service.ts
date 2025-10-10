import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service pour générer des embeddings avec Italian-Legal-BERT
 * Modèle spécialisé pour le droit italien de Hugging Face
 */
@Injectable()
export class ItalianEmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(ItalianEmbeddingsService.name);
  private readonly embeddingsUrl: string;
  private isAvailable = false;

  constructor(private readonly configService: ConfigService) {
    this.embeddingsUrl =
      this.configService.get<string>('ITALIAN_BERT_URL') ||
      'http://localhost:8080';
  }

  async onModuleInit() {
    await this.checkAvailability();
  }

  /**
   * Vérifie si le service d'embeddings est disponible
   */
  private async checkAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.embeddingsUrl}/health`);
      if (response.ok) {
        this.isAvailable = true;
        this.logger.log(
          '✅ Italian-Legal-BERT embeddings service is available',
        );
      } else {
        this.logger.warn(
          '⚠️ Italian-Legal-BERT service not responding. Falling back to default embeddings.',
        );
      }
    } catch (error) {
      this.logger.warn(
        `⚠️ Italian-Legal-BERT service not available at ${this.embeddingsUrl}. ` +
          'Using default embeddings. Error: ' +
          (error as Error).message,
      );
      this.isAvailable = false;
    }
  }

  /**
   * Génère des embeddings pour un texte avec Italian-Legal-BERT
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.isAvailable) {
      this.logger.warn('Italian-BERT not available, returning null');
      return null;
    }

    try {
      // Fetch sans timeout pour embeddings (peut prendre du temps sur CPU)
      const controller = new AbortController();
      const response = await fetch(`${this.embeddingsUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
        }),
        signal: controller.signal,
        // Pas de timeout → illimité pour CPU lent
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as number[][];
      return data[0]; // Retourne le premier embedding
    } catch (error) {
      this.logger.error(
        'Failed to generate embedding with Italian-BERT',
        error,
      );
      return null;
    }
  }

  /**
   * Génère des embeddings pour plusieurs textes
   */
  async generateEmbeddings(texts: string[]): Promise<number[][] | null> {
    if (!this.isAvailable) {
      this.logger.warn('Italian-BERT not available, returning null');
      return null;
    }

    try {
      // Fetch sans timeout pour batch embeddings (peut prendre du temps sur CPU)
      const controller = new AbortController();

      this.logger.log(
        `⏳ Generating ${texts.length} embeddings with Italian-BERT (no timeout)...`,
      );

      const response = await fetch(`${this.embeddingsUrl}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: texts,
        }),
        signal: controller.signal,
        // Pas de timeout → illimité pour CPU lent
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as number[][];
      this.logger.log(
        `✅ Generated ${data.length} embeddings with Italian-BERT`,
      );
      return data;
    } catch (error) {
      this.logger.error(
        'Failed to generate embeddings with Italian-BERT',
        error,
      );
      return null;
    }
  }

  /**
   * Vérifie si le service est disponible
   */
  isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Réessaye de se connecter au service
   */
  async reconnect(): Promise<void> {
    await this.checkAvailability();
  }
}
