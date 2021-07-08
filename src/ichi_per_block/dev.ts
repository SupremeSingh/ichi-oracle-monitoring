import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './index';

(async () => {
  const result = await handler({
    pathParameters: {}
  } as unknown as APIGatewayProxyEvent);
})();
