import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/config/database";
import { Worker } from "bullmq";
import { runJourneyNode } from "../../src/worker";
import { faker } from "@faker-js/faker";

describe("E2E: Complete Journey Execution", () => {
  let worker: Worker;
  let createdJourneyIds: string[] = [];
  let createdNodeIds: string[] = [];

  beforeAll(async () => {
    // Start the worker for e2e tests
    worker = new Worker("journey-execution", runJourneyNode, {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
    });
  });

  afterAll(async () => {
    await worker.close();
  });

  afterEach(async () => {
    // Clean up only the journeys created in these tests
    if (createdJourneyIds.length > 0 || createdNodeIds.length > 0) {
      await prisma.$transaction([
        prisma.executionLog.deleteMany({
          where: {
            run: {
              journeyId: { in: createdJourneyIds },
            },
          },
        }),
        prisma.run.deleteMany({
          where: {
            journeyId: { in: createdJourneyIds },
          },
        }),
        prisma.journeyNodes.deleteMany({
          where: {
            journeyId: { in: createdJourneyIds },
          },
        }),
        prisma.journey.deleteMany({
          where: {
            id: { in: createdJourneyIds },
          },
        }),
        prisma.journeyNode.deleteMany({
          where: {
            id: { in: createdNodeIds },
          },
        }),
      ]);
      createdJourneyIds = [];
      createdNodeIds = [];
    }
  });

  it("should execute a complete journey workflow end-to-end", async () => {
    // Generate unique IDs for this test
    const journeyName = faker.company.catchPhrase();
    const nodeIds = {
      start: faker.string.uuid(),
      delay: faker.string.uuid(),
      conditional: faker.string.uuid(),
      adult: faker.string.uuid(),
      minor: faker.string.uuid(),
    };

    // Track node IDs for cleanup
    createdNodeIds.push(...Object.values(nodeIds));

    // 1. Create a journey via API
    const journey = {
      name: journeyName,
      start_node_id: nodeIds.start,
      nodes: [
        {
          id: nodeIds.start,
          type: "LOG",
          message: "Journey started",
          next_node_id: nodeIds.delay,
        },
        {
          id: nodeIds.delay,
          type: "DELAY",
          duration_seconds: 1,
          next_node_id: nodeIds.conditional,
        },
        {
          id: nodeIds.conditional,
          type: "CONDITIONAL",
          condition: {
            field: "age",
            operator: ">",
            value: 18,
          },
          on_true_next_node_id: nodeIds.adult,
          on_false_next_node_id: nodeIds.minor,
        },
        {
          id: nodeIds.adult,
          type: "LOG",
          message: "Adult user detected",
          next_node_id: null,
        },
        {
          id: nodeIds.minor,
          type: "LOG",
          message: "Minor user detected",
          next_node_id: null,
        },
      ],
    };

    const createResponse = await request(app)
      .post("/journeys")
      .send(journey)
      .expect(201);

    const journeyId = createResponse.body.journeyId;
    createdJourneyIds.push(journeyId);

    // 2. Trigger the journey with patient context
    const patientContext = {
      patient_id: faker.string.uuid(),
      age: faker.number.int({ min: 19, max: 65 }),
      name: faker.person.fullName(),
    };

    const triggerResponse = await request(app)
      .post(`/journeys/${journeyId}/trigger`)
      .send(patientContext)
      .expect(202);

    const runId = triggerResponse.body.runId;

    // 3. Wait for the journey to complete (with timeout)
    const maxWaitTime = 10000; // 10 seconds
    const pollInterval = 500; // 500ms
    let attempts = 0;
    let runStatus = "PENDING";

    await new Promise((resolve) => setTimeout(resolve, 1000));

    while (runStatus !== "COMPLETED" && attempts < maxWaitTime / pollInterval) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusResponse = await request(app)
        .get(`/journeys/runs/${runId}`)
        .expect(200);

      runStatus = statusResponse.body.status;
      attempts++;
    }

    // 4. Verify the journey completed successfully
    expect(runStatus).toBe("COMPLETED");

    // 5. Verify execution logs were created
    const executionLogs = await prisma.executionLog.findMany({
      where: { runId },
    });

    // Should have logs for: start -> delay -> conditional -> adult
    expect(executionLogs).toHaveLength(4);
    expect(executionLogs[0].nodeId).toBe(nodeIds.start);
    expect(executionLogs[1].nodeId).toBe(nodeIds.delay);
    expect(executionLogs[2].nodeId).toBe(nodeIds.conditional);
    expect(executionLogs[3].nodeId).toBe(nodeIds.adult); // age > 18

    // 6. Verify final run state
    const finalRun = await prisma.run.findUnique({
      where: { id: runId },
    });

    expect(finalRun?.status).toBe("COMPLETED");
    expect(finalRun?.currentNodeId).toBeNull();
  });

  it("should handle journey with minor patient", async () => {
    // Generate unique IDs for this test
    const journeyName = faker.company.catchPhrase();
    const nodeIds = {
      conditional: faker.string.uuid(),
      adult: faker.string.uuid(),
      minor: faker.string.uuid(),
    };

    // Track node IDs for cleanup
    createdNodeIds.push(...Object.values(nodeIds));

    // Test the other branch of the conditional
    const journey = {
      name: journeyName,
      start_node_id: nodeIds.conditional,
      nodes: [
        {
          id: nodeIds.conditional,
          type: "CONDITIONAL",
          condition: {
            field: "age",
            operator: ">",
            value: 18,
          },
          on_true_next_node_id: nodeIds.adult,
          on_false_next_node_id: nodeIds.minor,
        },
        {
          id: nodeIds.adult,
          type: "LOG",
          message: "Adult user",
          next_node_id: null,
        },
        {
          id: nodeIds.minor,
          type: "LOG",
          message: "Minor user",
          next_node_id: null,
        },
      ],
    };

    const createResponse = await request(app)
      .post("/journeys")
      .send(journey)
      .expect(201);

    const journeyId = createResponse.body.journeyId;
    createdJourneyIds.push(journeyId);

    const triggerResponse = await request(app)
      .post(`/journeys/${journeyId}/trigger`)
      .send({
        patient_id: faker.string.uuid(),
        age: faker.number.int({ min: 10, max: 18 }),
      })
      .expect(202);

    // Wait for completion
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const executionLogs = await prisma.executionLog.findMany({
      where: { runId: triggerResponse.body.runId },
      orderBy: { createdAt: "asc" },
    });

    expect(executionLogs).toHaveLength(2);
    expect(executionLogs[0].nodeId).toBe(nodeIds.conditional);
    expect(executionLogs[1].nodeId).toBe(nodeIds.minor); // age <= 18
  });
});
