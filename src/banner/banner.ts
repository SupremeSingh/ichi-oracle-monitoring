import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './indexBanner';

(async () => {
  await handler({} as unknown as APIGatewayProxyEvent);
})();
