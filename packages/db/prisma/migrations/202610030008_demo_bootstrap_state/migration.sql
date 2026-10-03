CREATE TABLE "demo_bootstrap_state" (
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_bootstrap_state_pkey" PRIMARY KEY ("key")
);
