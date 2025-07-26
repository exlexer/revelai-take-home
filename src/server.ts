import app from "./app";
import { connectDatabases } from "./config/database";
import { queue } from "./queue";
import { setupShutdownHandlers } from "./utils/shutdown";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDatabases();

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    // Setup graceful shutdown handlers
    setupShutdownHandlers(server, queue);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
