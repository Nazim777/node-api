import { ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient, QUEUE_URL } from "../config/sqs";

async function processMessage(body: string, receiptHandle: string) {
  const { name, email } = JSON.parse(body) as { name: string; email: string };

  // Replace this log with SES email sending when SES is set up
  console.log(`Welcome email sent to ${name} <${email}>`);

  await sqsClient.send(
    new DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle: receiptHandle })
  );
}

async function poll() {
  while (true) {
    try {
      const { Messages } = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20, // long polling — reduces cost
        })
      );

      if (Messages?.length) {
        await Promise.all(
          Messages.map((msg) => processMessage(msg.Body!, msg.ReceiptHandle!))
        );
      }
    } catch (err: any) {
      console.error("SQS worker error:", err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

export function startEmailWorker() {
  console.log("Email worker started, polling SQS...");
  poll();
}
