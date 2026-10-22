-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'ceo', 'vendedor');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGIN_BLOCKED', 'LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'USER_CREATED', 'USER_ROLE_CHANGED', 'USER_DEACTIVATED', 'USER_REACTIVATED');

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorId" TEXT,
    "targetUserId" TEXT,
    "email" TEXT,
    "ip" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE INDEX "AuditLogs_email_action_createdAt_idx" ON "AuditLogs"("email", "action", "createdAt");
