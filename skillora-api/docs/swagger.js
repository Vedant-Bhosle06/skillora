const swaggerUi = require('swagger-ui-express');
const spec = require('./openapi');

module.exports = (app) => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
  app.get('/api/docs.json', (req, res) => res.json(spec));
};
