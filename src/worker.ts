import { Job } from "bullmq";
import { PatientContext } from "./types";
import { prisma } from "./config/database";
import { queue } from "./queue";

export type Run = {
  runId: string;
  nodeId: string;
  patientContext: PatientContext;
};

export async function runJourneyNode(job: Job<Run>) {
  const { runId, nodeId, patientContext } = job.data;

  console.log(`Running node ${nodeId} for run ${runId}`);

  try {
    await prisma.run.update({
      where: {
        id: runId,
      },
      data: {
        status: "IN_PROGRESS",
        currentNodeId: nodeId,
      },
    });

    const node = await prisma.journeyNode.findUnique({
      where: {
        id: nodeId,
      },
    });

    let nextNodeId: string;
    let delay = 0;

    switch (node?.type) {
      case "LOG":
        const { message } = node.definition as {
          message: string;
        };

        console.log(`Logging message: ${message}`);

        nextNodeId = (node!.definition as { next_node_id: string })
          .next_node_id;

        break;
      case "DELAY":
        const { duration_seconds } = node.definition as {
          duration_seconds: number;
          next_node_id: string;
        };

        delay = duration_seconds * 1000;

        nextNodeId = (node!.definition as { next_node_id: string })
          .next_node_id;

        break;
      case "CONDITIONAL":
        const { condition, on_true_next_node_id, on_false_next_node_id } =
          node.definition as {
            condition: {
              field: keyof PatientContext;
              operator: string;
              value: string;
            };
            on_true_next_node_id: string;
            on_false_next_node_id: string;
          };
        const { field, operator, value } = condition;
        const patientValue = patientContext[field];

        let conditionMet = false;

        switch (operator) {
          case "=":
            conditionMet = patientValue === value;
            break;
          case "!=":
            conditionMet = patientValue !== value;
            break;
          case "<":
            conditionMet = patientValue < value;
            break;
          case ">=":
            conditionMet = patientValue >= value;
            break;
          case "<=":
            conditionMet = patientValue <= value;
            break;
          case ">":
            conditionMet = patientValue > value;
            break;
        }

        nextNodeId = conditionMet
          ? on_true_next_node_id
          : on_false_next_node_id;

        break;
      default:
        throw new Error(`Unknown node type ${node?.type}`);
    }

    await prisma.executionLog.create({
      data: {
        runId,
        nodeId,
        status: "success",
      },
    });

    if (nextNodeId) {
      queue.add(
        "RUN_JOURNEY_NODE",
        {
          runId,
          nodeId: nextNodeId,
          patientContext,
        },
        {
          delay,
        },
      );
    } else {
      await prisma.run.update({
        where: {
          id: runId,
        },
        data: {
          status: "COMPLETED",
          currentNodeId: null,
        },
      });
    }
  } catch (err) {
    console.error(err);
    await prisma.run.update({
      where: {
        id: runId,
      },
      data: {
        status: "FAILED",
        currentNodeId: null,
      },
    });
  }
}
