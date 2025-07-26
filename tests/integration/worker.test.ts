import { Job } from "bullmq";
import { Run, runJourneyNode } from "../../src/worker";
import { prisma } from "../../src/config/database";
import { queue } from "../../src/queue";
import { PatientContext } from "../../src/types";

describe("Worker tests", () => {
  afterEach(async () => {
    // Clean up any jobs in the queue (including delayed ones)
    await queue.obliterate();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process LOG node successfully", async () => {
    // spy the console.log
    const consoleLogSpy = jest.spyOn(console, "log");

    // Create a test journey
    await prisma.journeyNode.create({
      data: {
        id: "node1",
        type: "LOG",
        definition: {
          message: "Welcome!",
          next_node_id: null,
        },
      },
    });

    const journey = await prisma.journey.create({
      data: {
        name: "Test Journey",
        startNodeId: "node1",
        nodes: {
          create: [
            {
              nodeId: "node1",
            },
          ],
        },
      },
    });

    const patientContext = {
      name: "John Doe",
      age: 30,
    } as unknown as PatientContext;

    const run = await prisma.run.create({
      data: {
        journeyId: journey.id,
        status: "PENDING", // should eventually be IN_PROGRESS
        currentNodeId: "node1",
        patientContext: patientContext as any,
      },
    });

    await runJourneyNode({
      id: "node1",
      data: {
        runId: run.id,
        nodeId: "node1",
        patientContext,
      },
    } as Job<Run>);

    expect(consoleLogSpy).toHaveBeenCalledWith("Logging message: Welcome!");

    const executionLogs = await prisma.executionLog.findMany({
      where: {
        runId: run.id,
      },
    });

    expect(executionLogs).toHaveLength(1);
    expect(executionLogs[0].runId).toBe(run.id);
    expect(executionLogs[0].nodeId).toBe("node1");

    const updatedRun = await prisma.run.findUnique({
      where: {
        id: run.id,
      },
    });

    expect(updatedRun?.status).toBe("COMPLETED");
  });

  it("should process DELAY node successfully", async () => {
    // Create a test journey
    await prisma.journeyNode.createMany({
      data: [
        {
          id: "node1",
          type: "DELAY",
          definition: {
            duration_seconds: 1,
            next_node_id: "node2",
          },
        },
        {
          id: "node2",
          type: "LOG",
          definition: {
            message: "Welcome!",
            next_node_id: null,
          },
        },
      ],
    });

    const journey = await prisma.journey.create({
      data: {
        name: "Test Journey",
        startNodeId: "node1",
        nodes: {
          create: [
            {
              nodeId: "node1",
            },
          ],
        },
      },
    });

    const patientContext = {
      name: "John Doe",
      age: 30,
    } as unknown as PatientContext;

    const run = await prisma.run.create({
      data: {
        journeyId: journey.id,
        status: "PENDING", // should eventually be IN_PROGRESS
        currentNodeId: "node1",
        patientContext: patientContext as any,
      },
    });

    await runJourneyNode({
      id: "node1",
      data: {
        runId: run.id,
        nodeId: "node1",
        patientContext,
      },
    } as Job<Run>);

    let delayedJobs = await queue.getDelayedCount();
    expect(delayedJobs).toBe(1);

    const executionLogs = await prisma.executionLog.findMany({
      where: {
        runId: run.id,
      },
    });

    expect(executionLogs).toHaveLength(1);
    expect(executionLogs[0].runId).toBe(run.id);
    expect(executionLogs[0].nodeId).toBe("node1");

    const updatedRun = await prisma.run.findUnique({
      where: {
        id: run.id,
      },
    });

    expect(updatedRun?.status).toBe("IN_PROGRESS");
  });

  it("should process CONDITIONAL node successfully", async () => {
    // Create a test journey
    await prisma.journeyNode.createMany({
      data: [
        {
          id: "node1",
          type: "CONDITIONAL",
          definition: {
            condition: {
              field: "age",
              operator: ">",
              value: 25,
            },
            on_true_next_node_id: "node2",
            on_false_next_node_id: "node3",
          },
        },
      ],
    });

    const journey = await prisma.journey.create({
      data: {
        name: "Test Journey",
        startNodeId: "node1",
        nodes: {
          create: [
            {
              nodeId: "node1",
            },
          ],
        },
      },
    });

    const youngPatientContext = {
      name: "John Doe",
      age: 20,
    } as unknown as PatientContext;

    const youngRun = await prisma.run.create({
      data: {
        journeyId: journey.id,
        status: "PENDING", // should eventually be IN_PROGRESS
        currentNodeId: "node1",
        patientContext: youngPatientContext as any,
      },
    });

    const oldPatientContext = {
      name: "Jane Doe",
      age: 30,
    } as unknown as PatientContext;

    const oldRun = await prisma.run.create({
      data: {
        journeyId: journey.id,
        status: "PENDING", // should eventually be IN_PROGRESS
        currentNodeId: "node1",
        patientContext: oldPatientContext as any,
      },
    });

    await runJourneyNode({
      id: "node1",
      data: {
        runId: youngRun.id,
        nodeId: "node1",
        patientContext: youngPatientContext,
      },
    } as Job<Run>);

    await runJourneyNode({
      id: "node2",
      data: {
        runId: oldRun.id,
        nodeId: "node1",
        patientContext: oldPatientContext,
      },
    } as Job<Run>);

    let queueJobs = await queue.getJobs();
    expect(queueJobs).toHaveLength(2);

    const youngRunNextJob = queueJobs[0];
    expect(youngRunNextJob.data.nodeId).toBe("node2");

    const oldRunNextJob = queueJobs[1];
    expect(oldRunNextJob.data.nodeId).toBe("node3");
  });
});
