import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './index';

(async () => {
  await handler({
    pathParameters: {}
  } as unknown as APIGatewayProxyEvent);
})();
