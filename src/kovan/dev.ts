import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './index';

(async () => {
  await handler({
    pathParameters: {
      name: 'ichi'
    }
  } as unknown as APIGatewayProxyEvent);
})();
