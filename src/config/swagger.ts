// import swaggerJsdoc from "swagger-jsdoc";
// import swaggerUi from "swagger-ui-express";
// import { Express } from "express";
// import mongooseToSwagger from "mongoose-to-swagger";
// import fs from "fs";
// import path from "path";

// // =============================
// // AUTO LOAD ALL MONGOOSE MODELS
// // =============================

// const loadSchemas = () => {
//   const schemas: Record<string, any> = {};
//   const modelsPath = path.join(__dirname, "../models");

//   fs.readdirSync(modelsPath).forEach((file) => {
//     if (file.endsWith(".ts") || file.endsWith(".js")) {
//       const model = require(path.join(modelsPath, file)).default;
//       if (model?.modelName) {
//         schemas[model.modelName] = mongooseToSwagger(model);
//       }
//     }
//   });

//   return schemas;
// };

// // =============================
// // SETUP SWAGGER
// // =============================

// export const setupSwagger = (app: Express) => {
//   const schemas = loadSchemas();

//   const options: swaggerJsdoc.Options = {
//     definition: {
//       openapi: "3.0.0",
//       info: {
//         title: "Enterprise Document Management API",
//         version: "1.0.0",
//         description: "🔥 Auto generated Swagger Documentation",
//       },
//       servers: [
//         {
//           url: `http://localhost:${process.env.PORT}`,
//         },
//       ],
//       components: {
//         securitySchemes: {
//           bearerAuth: {
//             type: "http",
//             scheme: "bearer",
//             bearerFormat: "JWT",
//           },
//         },
//         schemas: loadSchemas(),
//       },
//       security: [
//         {
//           bearerAuth: [],
//         },
//       ],
//     },

//     // AUTO SCAN ALL ROUTES
//     apis: ["./src/routes/**/*.ts"],
//   };

//   const swaggerSpec = swaggerJsdoc(options);

//   app.use(
//     "/api-docs",
//     swaggerUi.serve,
//     swaggerUi.setup(swaggerSpec, {
//       explorer: true,
//       customSiteTitle: "Enterprise API Docs",
//     })
//   );

//   console.log("📘 Swagger running at /api-docs");
// };