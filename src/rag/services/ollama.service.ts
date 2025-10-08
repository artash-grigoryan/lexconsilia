import { Injectable, Logger } from '@nestjs/common';
import { GenerateResponse, Ollama } from 'ollama';
import { QueryTypesEnum } from '../../constants/query-types.enum';
import { LegalQueryPrompt } from '../../constants/legal-query.prompt';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private ollama: Ollama;
  private readonly model = 'mistral:7b-instruct-q4_0'; // Version quantifiée, ~4GB au lieu de 10GB

  constructor() {
    this.ollama = new Ollama({
      host: process.env.OLLAMA_URL || 'http://localhost:11434',
      // Timeout long pour génération sur CPU (5 minutes)
      fetch: globalThis.fetch,
    });

    this.logger.log(`OllamaService initialized with model: ${this.model}`);
    this.logger.log(`⚠️  Note: Responses may take 30-120s on CPU`);
  }

  async generateResponse(
    query: string,
    context: string,
    QueryTypesEnum: QueryTypesEnum,
  ): Promise<string> {
    try {
      // Limiter le contexte pour éviter de dépasser la limite du modèle (4096 tokens)
      const truncatedContext = this.truncateContext(context, 2500); // ~1875 tokens
      const prompt = LegalQueryPrompt.buildPrompt(
        query,
        truncatedContext,
        QueryTypesEnum,
      );

      this.logger.log(`Generating response for query type: ${QueryTypesEnum}`);
      this.logger.log(
        `Context: ${context.length} chars → ${truncatedContext.length} chars (optimized for 4096 ctx)`,
      );

      this.logger.log(`⏳ Generating with Ollama (may take 30-120s on CPU)...`);

      const generated: GenerateResponse = await this.ollama.generate({
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          num_ctx: 4096, // Context window (limité par RAM Docker)
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 256, // Réponses courtes pour éviter timeouts
        },
      });

      this.logger.log(
        `✅ Response generated (${generated.response.length} chars)`,
      );

      return generated.response;
    } catch (error: unknown) {
      this.logger.error('Failed to generate response from Ollama', error);
      throw error;
    }
  }

  async generateStreamResponse(
    query: string,
    context: string,
    QueryTypesEnum: QueryTypesEnum,
  ): Promise<AsyncIterable<any>> {
    try {
      const prompt = LegalQueryPrompt.buildPrompt(
        query,
        context,
        QueryTypesEnum,
      );

      this.logger.log(
        `Generating stream response for query type: ${QueryTypesEnum}`,
      );

      const response = await this.ollama.generate({
        model: this.model,
        prompt: prompt,
        stream: true,
      });

      return response;
    } catch (error: unknown) {
      this.logger.error(
        'Failed to generate stream response from Ollama',
        error,
      );
      throw error;
    }
  }

  /**
   * Tronque le contexte pour éviter de dépasser la limite du modèle
   * @param context Le contexte complet
   * @param maxChars Nombre maximum de caractères (approximatif ~750 tokens par 1000 chars)
   */
  private truncateContext(context: string, maxChars: number = 3000): string {
    if (context.length <= maxChars) {
      return context;
    }

    this.logger.warn(
      `Context too long (${context.length} chars), truncating to ${maxChars} chars`,
    );

    // Couper au niveau d'un paragraphe ou d'une phrase pour garder la cohérence
    const truncated = context.substring(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    const cutPoint = Math.max(lastPeriod, lastNewline);

    if (cutPoint > maxChars * 0.8) {
      // Si on a un point de coupure valide dans les derniers 20%
      return truncated.substring(0, cutPoint + 1);
    }

    return truncated + '...';
  }

  async checkModelAvailability(): Promise<boolean> {
    try {
      const models = await this.ollama.list();
      const modelExists = models.models.some((m) =>
        m.name.includes(this.model),
      );

      if (!modelExists) {
        this.logger.warn(
          `Model ${this.model} not found. Please pull it using: ollama pull ${this.model}`,
        );
      }

      return modelExists;
    } catch (error: unknown) {
      this.logger.error('Failed to check model availability', error);
      return false;
    }
  }

  async pullModel(): Promise<void> {
    try {
      this.logger.log(`Pulling model ${this.model}...`);
      await this.ollama.pull({ model: this.model, stream: false });
      this.logger.log(`Model ${this.model} pulled successfully`);
    } catch (error: unknown) {
      this.logger.error('Failed to pull model', error);
      throw error;
    }
  }
}
