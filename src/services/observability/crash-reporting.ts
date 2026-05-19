import { trackRunSpotEvent } from './analytics';

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 140);
  }

  return String(error).slice(0, 140);
}

export async function recordNonFatalError(error: unknown, context: string) {
  await trackRunSpotEvent({
    name: 'app_exception',
    params: {
      context,
      fatal: false,
      message: errorMessage(error),
    },
  });
}
