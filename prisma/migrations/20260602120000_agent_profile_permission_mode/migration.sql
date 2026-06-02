-- IM/Web Profile：工具执行方式（open | interactive | locked）
ALTER TABLE "AgentProfile" ADD COLUMN "permissionMode" TEXT NOT NULL DEFAULT 'locked';

UPDATE "AgentProfile" SET "permissionMode" = 'open' WHERE "profileId" = 'web-default';
