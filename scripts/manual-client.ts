const apiUrl =
  process.env.MANUAL_API_URL ?? "http://localhost:3000/api/v1/analyze";

const samplePayload = {
  userQuery: "Summarize server errors and flag critical IDs.",
  documentContext: [
    {
      serverId: "svr_01",
      endpoint: "/auth",
      status: 200,
      latencyMs: 42,
      user: { id: 101, role: "admin" },
      tags: ["auth", "stable"],
    },
    {
      serverId: "svr_02",
      endpoint: "/payout",
      status: 500,
      latencyMs: 932,
      user: { id: 102, role: "operator" },
      tags: ["payments", "critical"],
    },
    {
      serverId: "svr_03",
      endpoint: "/webhook",
      status: 500,
      latencyMs: 881,
      user: { id: 103, role: "system" },
      tags: ["webhook", "retry"],
    },
  ],
};

async function main() {
  console.log(`Sending manual test request to ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(samplePayload),
  });

  const text = await response.text();
  let body: unknown = text;

  try {
    body = JSON.parse(text);
  } catch {
    // Keep raw text if the server returned non-JSON.
  }

  if (!response.ok) {
    console.error(`Manual test failed with HTTP ${response.status}`);
    console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log("Manual test completed successfully.");
  console.log(JSON.stringify(body, null, 2));
}

main().catch((error: unknown) => {
  console.error(
    "Manual test crashed. Make sure the API is running and GEMINI_API_KEY is set.",
  );
  console.error(error);
  process.exit(1);
});
