import { QueryTypesEnum } from './query-types.enum';

export class LegalQueryPrompt {
  private static readonly BASE_PROMPT = `You are an expert legal assistant, specialized in law. You must provide precise and professional answers based exclusively on the provided context. IMPORTANT: ALWAYS answer in the same language as the user's Question/Request.`;

  static getSystemPrompt(queryType: QueryTypesEnum): string {
    switch (queryType) {
      case QueryTypesEnum.SUMMARY:
        return `${this.BASE_PROMPT} Your task is to provide a clear and concise summary of the provided document, highlighting the key points and important legal information.`;

      case QueryTypesEnum.QUESTION:
        return `${this.BASE_PROMPT} Your task is to answer the question based exclusively on the provided context. If the information is not present in the context, clearly indicate this.`;

      case QueryTypesEnum.ANALYSIS:
        return `${this.BASE_PROMPT} Your task is to provide a detailed legal analysis of the case or document, identifying the applicable legal points, relevant precedents, and legal implications.`;

      default:
        return this.BASE_PROMPT;
    }
  }

  static buildPrompt(
    query: string,
    context: string,
    QueryTypesEnum: QueryTypesEnum,
  ): string {
    const systemPrompt = this.getSystemPrompt(QueryTypesEnum);

    return `${systemPrompt}

Relevant legal context:
${context}

Question/Request:
${query}

Answer:`;
  }
}
