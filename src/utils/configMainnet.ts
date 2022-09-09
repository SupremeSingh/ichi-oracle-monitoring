import AWS from 'aws-sdk';

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1'
});

export const dbClient = new AWS.DynamoDB({ apiVersion: '2012-08-10' });