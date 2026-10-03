CREATE TABLE "analytics_counters" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "eventType" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_counters_day_eventType_targetKey_key"
    ON "analytics_counters"("day", "eventType", "targetKey");
CREATE INDEX "analytics_counters_day_eventType_idx"
    ON "analytics_counters"("day", "eventType");
