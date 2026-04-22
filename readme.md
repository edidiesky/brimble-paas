
types
 1. types/index.ts (done)
 2. constants/index.ts
 3. utils/logger.ts - createLogger factory
 4. utils/errors.ts - typed error classes

Phase 2: Data Layer

 5. models/DeploymentModel.ts
 6. models/DeploymentLogModel.ts
 7. models/DeadLetterModel.ts
 8. models/OutboxModel.ts
 9. repository/deployment.repository.ts
 10. repository/deployment-log.repository.ts
 11. repository/dead-letter.repository.ts

Phase 3: Messaging

 12. messaging/topics.ts
 13. messaging/connection.ts
 14. messaging/producer.ts
 15. messaging/consumers/deployment.consumer.ts

Phase 4: Pipeline

 16. events/bus.ts
 17. pipeline/log-writer.ts
 18. pipeline/steps/clone.ts
 19. pipeline/steps/build.ts
 20. pipeline/steps/run.ts
 21. pipeline/steps/register.ts
 22. pipeline/runner.ts

Phase 5: Services + Controllers

 23. services/deployment.service.ts
 24. services/dead-letter.service.ts
 25. services/docker.service.ts
 26. services/caddy.service.ts
 27. controllers/deployment.controller.ts
 28. controllers/dead-letter.controller.ts

Phase 6: HTTP Layer

 29. validators/deployment.validator.ts
 30. middleware/validateRequest.ts
 31. middleware/requestId.ts
 32. middleware/errorHandler.ts
 33. middleware/upload.ts
 34. routes/deployment.routes.ts
 35. routes/dead-letter.routes.ts
 36. app.ts

Phase 7: Lifecycle

 37. bootstrap.ts
 38. shutdown.ts
 39. server.ts

Phase 8: Infra

 40. docker-compose.yml
 41. Caddyfile
 42. Dockerfile

Phase 9: Frontend

 43. Vite + TanStack setup
 44. DeployForm.tsx
 45. DeploymentList.tsx
 46. LogStream.tsx + SSE hook
 47. apps/ui/Dockerfile

Phase 10: Sample App + Docs

 48. sample-app/
 49. README.md