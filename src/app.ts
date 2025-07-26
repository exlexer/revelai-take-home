import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Journey, PatientContext } from "./types";
import { queue } from "./queue";
import { prisma } from "./config/database";
import { NodeType } from "./generated/prisma";

dotenv.config();

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.post("/journeys", async (req: Request, res: Response) => {
  try {
    const journey: Journey = req.body;

    // Create all nodes first
    const createdNodes = await Promise.all(
      journey.nodes.map(({ id, type, ...definition }) =>
        prisma.journeyNode.create({
          data: {
            id,
            type: type as NodeType,
            definition,
          },
        }),
      ),
    );

    // Create journey with nodes
    const createdJourney = await prisma.journey.create({
      data: {
        name: journey.name,
        startNodeId: journey.start_node_id,
        nodes: {
          create: createdNodes.map((node) => ({
            nodeId: node.id,
          })),
        },
      },
      include: {
        nodes: {
          include: {
            node: true,
          },
        },
      },
    });

    res.status(201).json({
      journeyId: createdJourney.id,
    });
  } catch (error) {
    console.error("Error creating journey:", error);
    res.status(500).json({ error: "Failed to create journey" });
  }
});

app.post(
  "/journeys/:journeyId/trigger",
  async (req: Request, res: Response) => {
    try {
      const { journeyId } = req.params;
      const patientContext: PatientContext = req.body;

      // Get journey from database
      const journey = await prisma.journey.findUnique({
        where: { id: journeyId },
        include: {
          startNode: true,
        },
      });

      if (!journey) {
        return res.status(404).json({ error: "Journey not found" });
      }

      // Create run
      const run = await prisma.run.create({
        data: {
          journeyId: journey.id,
          status: "PENDING",
          currentNodeId: journey.startNodeId,
          patientContext: patientContext as any,
        },
      });

      // Queue the first node for processing
      const startNode = journey.startNode;
      await queue.add("RUN_JOURNEY_NODE", {
        runId: run.id,
        nodeId: startNode.id,
        patientContext,
      });

      // Add location header
      res.setHeader("Location", `/journeys/runs/${run.id}`);
      return res.status(202).json({
        runId: run.id,
      });
    } catch (error) {
      console.error("Error triggering journey:", error);
      return res.status(500).json({ error: "Failed to trigger journey" });
    }
  },
);

app.get("/journeys/runs/:runId", async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: {
        journey: true,
        executionLogs: {
          orderBy: { executedAt: "desc" },
        },
      },
    });

    if (!run) {
      return res.status(404).json({ error: "Run not found" });
    }

    return res.status(200).json({
      status: run.status,
      currentNodeId: run.currentNodeId,
      patientContext: run.patientContext,
    });
  } catch (error) {
    console.error("Error fetching run:", error);
    return res.status(500).json({ error: "Failed to fetch run" });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

export default app;
