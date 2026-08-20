(function attachImportWorker(workerScope) {
  "use strict";

  const cancelledTasks = new Set();

  workerScope.addEventListener("message", async (event) => {
    const message = event.data || {};
    if (message.type === "cancel") {
      cancelledTasks.add(message.taskId);
      return;
    }
    if (message.type !== "process" || !message.taskId) return;
    const { taskId } = message;
    try {
      const result = await workerScope.PidanvocaImport.processImportedBooks(
        message.books,
        {
          limits: message.limits,
          isCancelled: () => cancelledTasks.has(taskId),
          yieldControl: () =>
            new Promise((resolve) => workerScope.setTimeout(resolve, 0)),
          onProgress: (progress) =>
            workerScope.postMessage({ type: "progress", taskId, progress }),
        },
      );
      if (!cancelledTasks.has(taskId)) {
        workerScope.postMessage({ type: "complete", taskId, result });
      }
    } catch (error) {
      workerScope.postMessage({
        type: error?.name === "ImportCancelledError" ? "cancelled" : "error",
        taskId,
        message: error instanceof Error ? error.message : "导入处理失败。",
      });
    } finally {
      cancelledTasks.delete(taskId);
    }
  });
})(self);
