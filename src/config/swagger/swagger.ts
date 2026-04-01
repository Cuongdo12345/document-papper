import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { Express } from "express";

export const setupSwagger = (app: Express) => {
  const swaggerPath = path.join(__dirname, "../../docs/openAPI.yaml");

  const swaggerDocument = YAML.load(swaggerPath);

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      explorer: true,
      customSiteTitle: "Document Papper API Docs",
    }),
  );
};
