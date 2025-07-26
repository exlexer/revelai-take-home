import { Queue } from "bullmq";
import { QUEUE_NAME } from "./constants";

export const queue = new Queue(QUEUE_NAME);
