const isProduction = process.env.NODE_ENV === 'production';

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseCsv(value: string | undefined): string[] {
  return (
    value
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    user: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    name: process.env.DATABASE_NAME ?? 'expense_bot',
    ssl: parseBoolean(process.env.DATABASE_SSL, isProduction),
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    allowedUserIds: parseCsv(process.env.TELEGRAM_ALLOWED_USER_IDS),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    classifierEnabled: parseBoolean(
      process.env.OPENAI_CLASSIFIER_ENABLED,
      false,
    ),
    classifierModel:
      process.env.OPENAI_CLASSIFIER_MODEL ?? 'gpt-4o-mini-2024-07-18',
    classifierMinConfidence: Number(
      process.env.OPENAI_CLASSIFIER_MIN_CONFIDENCE ?? '0.75',
    ),
  },
});
