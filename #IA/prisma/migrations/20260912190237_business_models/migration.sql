-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ativo', 'inativo', 'pausado');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('prospecting', 'negotiation', 'sold', 'lost');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'normal', 'high');

-- CreateTable
CREATE TABLE "Students" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "cpf" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ativo',
    "notes" TEXT,
    "lastContactDate" TIMESTAMP(3),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Courses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchases" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "purchaseDate" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineLeads" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'prospecting',
    "assignedTo" TEXT NOT NULL,
    "value" DECIMAL(10,2),
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineLeads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedTo" TEXT NOT NULL,
    "relatedTo" TEXT,
    "relatedType" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'normal',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Students_email_key" ON "Students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Students_cpf_key" ON "Students"("cpf");

-- CreateIndex
CREATE INDEX "Students_assignedTo_idx" ON "Students"("assignedTo");

-- CreateIndex
CREATE INDEX "Students_status_idx" ON "Students"("status");

-- CreateIndex
CREATE INDEX "Students_createdAt_idx" ON "Students"("createdAt");

-- CreateIndex
CREATE INDEX "Courses_isActive_idx" ON "Courses"("isActive");

-- CreateIndex
CREATE INDEX "Purchases_studentId_idx" ON "Purchases"("studentId");

-- CreateIndex
CREATE INDEX "Purchases_courseId_idx" ON "Purchases"("courseId");

-- CreateIndex
CREATE INDEX "Purchases_purchaseDate_idx" ON "Purchases"("purchaseDate");

-- CreateIndex
CREATE UNIQUE INDEX "Purchases_studentId_courseId_key" ON "Purchases"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "PipelineLeads_studentId_idx" ON "PipelineLeads"("studentId");

-- CreateIndex
CREATE INDEX "PipelineLeads_assignedTo_idx" ON "PipelineLeads"("assignedTo");

-- CreateIndex
CREATE INDEX "PipelineLeads_status_idx" ON "PipelineLeads"("status");

-- CreateIndex
CREATE INDEX "PipelineLeads_createdAt_idx" ON "PipelineLeads"("createdAt");

-- CreateIndex
CREATE INDEX "Tasks_assignedTo_idx" ON "Tasks"("assignedTo");

-- CreateIndex
CREATE INDEX "Tasks_dueDate_idx" ON "Tasks"("dueDate");

-- CreateIndex
CREATE INDEX "Tasks_relatedTo_idx" ON "Tasks"("relatedTo");

-- CreateIndex
CREATE INDEX "Tasks_completedAt_idx" ON "Tasks"("completedAt");

-- CreateIndex
CREATE INDEX "Tasks_createdAt_assignedTo_idx" ON "Tasks"("createdAt" DESC, "assignedTo");

-- AddForeignKey
ALTER TABLE "Students" ADD CONSTRAINT "Students_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchases" ADD CONSTRAINT "Purchases_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchases" ADD CONSTRAINT "Purchases_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineLeads" ADD CONSTRAINT "PipelineLeads_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineLeads" ADD CONSTRAINT "PipelineLeads_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_relatedTo_fkey" FOREIGN KEY ("relatedTo") REFERENCES "Students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
