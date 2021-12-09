import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './indexBanner';

(async () => {
  const result = await handler({
  } as unknown as APIGatewayProxyEvent);
})();
