import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/config/database";
import { Journey } from "../../src/types";
import { queue } from "../../src/queue";

describe("Journeys endpoints", () => {
  describe("POST /journeys", () => {
    it("should create a new journey successfully", async () => {
      const journey: Journey = {
        name: "Test Journey",
        start_node_id: "node1",
        nodes: [
          {
            id: "node1",
            type: "CONDITIONAL",
            condition: {
              field: "age",
              operator: ">",
              value: 18,
            },
            on_true_next_node_id: "node2",
            on_false_next_node_id: "node3",
          },
          {
            id: "node2",
            type: "LOG",
            message: "Welcome!",
            next_node_id: null,
          },
          {
            id: "node3",
            type: "LOG",
            message: "Sorry, you are too young.",
            next_node_id: null,
          },
        ],
      };

      const response = await request(app)
        .post("/journeys")
        .send(journey)
        .expect(201);

      expect(response.body).toHaveProperty("journeyId");
      expect(response.body.journeyId).toBeTruthy();

      // Verify in database
      const dbJourney = await prisma.journey.findUnique({
        where: { id: response.body.journeyId },
        include: { nodes: { include: { node: true } } },
      });

      expect(dbJourney).toBeTruthy();
      expect(dbJourney?.name).toBe(journey.name);
      expect(dbJourney?.startNodeId).toBe(journey.start_node_id);
      expect(dbJourney?.nodes).toHaveLength(3);
    });

    it("should return 500 for invalid journey data", async () => {
      const invalidJourney = {
        // Missing required fields
        nodes: [],
      };

      await request(app).post("/journeys").send(invalidJourney).expect(500);
    });
  });

  describe("POST /journeys/:journeyId/trigger", () => {
    let journeyId: string;

    beforeEach(async () => {
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

      journeyId = journey.id;
    });

    afterEach(async () => {
      await prisma.$transaction([
        // First delete execution logs (depends on runs and nodes)
        prisma.executionLog.deleteMany(),
        // Then delete runs (depends on journeys)
        prisma.run.deleteMany(),
        // Delete the junction table entries (depends on journeys and nodes)
        prisma.journeyNodes.deleteMany(),
        // Delete journeys (depends on nodes via startNodeId)
        prisma.journey.deleteMany(),
        // Finally delete nodes (no dependencies)
        prisma.journeyNode.deleteMany(),
      ]);

      await queue.drain();
    });

    it("should trigger a journey successfully", async () => {
      const patientContext = {
        patient_id: "patient123",
        age: 25,
        gender: "male",
      };

      const response = await request(app)
        .post(`/journeys/${journeyId}/trigger`)
        .send(patientContext)
        .expect(202);

      expect(response.body).toHaveProperty("runId");
      expect(response.headers.location).toBe(
        `/journeys/runs/${response.body.runId}`,
      );

      // Verify run in database
      const run = await prisma.run.findUnique({
        where: { id: response.body.runId },
      });

      expect(run).toBeTruthy();
      expect(run?.journeyId).toBe(journeyId);
      expect(run?.status).toBe("PENDING");
      expect(run?.patientContext).toEqual(patientContext);

      const counts = await queue.getJobCounts();

      expect(counts.waiting).toBe(1);
    });

    it("should return 404 for non-existent journey", async () => {
      await request(app)
        .post("/journeys/non-existent-id/trigger")
        .send({ patient_id: "patient123" })
        .expect(404);

      const counts = await queue.getJobCounts();

      expect(counts.waiting).toBe(0);
    });
  });

  describe("GET /journeys/runs/:runId", () => {
    let runId: string;
    let patientContext: any;

    beforeEach(async () => {
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

      // Create test data
      //
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

      patientContext = {
        patient_id: "patient123",
        age: 30,
      };

      const run = await prisma.run.create({
        data: {
          journeyId: journey.id,
          status: "COMPLETED",
          currentNodeId: null,
          patientContext: patientContext,
        },
      });

      runId = run.id;
    });

    afterEach(async () => {
      await prisma.$transaction([
        // First delete execution logs (depends on runs and nodes)
        prisma.executionLog.deleteMany(),
        // Then delete runs (depends on journeys)
        prisma.run.deleteMany(),
        // Delete the junction table entries (depends on journeys and nodes)
        prisma.journeyNodes.deleteMany(),
        // Delete journeys (depends on nodes via startNodeId)
        prisma.journey.deleteMany(),
        // Finally delete nodes (no dependencies)
        prisma.journeyNode.deleteMany(),
      ]);
    });

    it("should return run status successfully", async () => {
      const response = await request(app)
        .get(`/journeys/runs/${runId}`)
        .expect(200);

      expect(response.body).toHaveProperty("status", "COMPLETED");
      expect(response.body).toHaveProperty("currentNodeId", null);
      expect(response.body).toHaveProperty("patientContext");
      expect(response.body.patientContext).toEqual(patientContext);
    });

    it("should return 404 for non-existent run", async () => {
      await request(app).get("/journeys/runs/non-existent-id").expect(404);
    });
  });
});
