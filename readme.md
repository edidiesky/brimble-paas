
types
 1. types/index.ts (done)
 2. constants/index.ts (done)
 3. utils/logger.ts - createLogger factory (done)
 4. utils/errors.ts - typed error classes (done)

Phase 2: Data Layer

 5. models/DeploymentModel.ts (done)
 6. models/DeploymentLogModel.ts (done)
 7. models/DeadLetterModel.ts (done)
 8. models/OutboxModel.ts (done)
 9. repository/deployment.repository.ts (done)
 10. repository/deployment-log.repository.ts (done)
 11. repository/dead-letter.repository.ts (done)

Phase 3: Messaging

 12. messaging/topics.ts (done)
 13. messaging/connection.ts (done)
 14. messaging/producer.ts (done)
 15. messaging/consumers/deployment.consumer.ts (done)

Phase 4: Pipeline

 16. events/bus.ts (done)
 17. pipeline/log-writer.ts (done)
 18. pipeline/steps/clone.ts (done)
 19. pipeline/steps/build.ts (done)
 20. pipeline/steps/run.ts (done)
 21. pipeline/steps/register.ts (done)
 22. pipeline/runner.ts (done)

Phase 5: Services + Controllers

 23. services/deployment.service.ts (done)
 24. services/dead-letter.service.ts (done)
 25. services/docker.service.ts (done)
 26. services/caddy.service.ts (done)
 27. controllers/deployment.controller.ts (done)
 28. controllers/dead-letter.controller.ts (done)

Phase 6: HTTP Layer

 29. validators/deployment.validator.ts (done)
 30. middleware/validateRequest.ts (done)
 31. middleware/requestId.ts (done)
 32. middleware/errorHandler.ts (done)
 33. middleware/upload.ts (done)
 34. routes/deployment.routes.ts (done)
 35. routes/dead-letter.routes.ts (done)
 36. app.ts (done)

Phase 7: Lifecycle

 37. bootstrap.ts (done)
 38. shutdown.ts (done)
 39. server.ts (done)

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