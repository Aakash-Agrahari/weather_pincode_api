import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Weather Info for Pincode API',
      version: '1.0.0',
      description:
        'REST API that returns weather information for a given Pincode + date, ' +
        'with DB-backed caching so repeated calls are optimized (no UI, testable via Postman/Swagger).',
    },
    servers: [{ url: '/', description: 'Current server' }],
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
