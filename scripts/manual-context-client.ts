const apiBaseUrl =
  process.env.PAYLOADTOON_API_BASE_URL ?? "http://localhost:3000/api/v1";

const documentContext = [
  {
    serverId: "svr_01",
    endpoint: "/auth/login",
    status: 200,
    latencyMs: 142,
    region: "us-east-1",
    user: { id: "usr_1001", role: "customer" },
    tags: ["auth", "login"],
  },
  {
    serverId: "svr_02",
    endpoint: "/payments/payout",
    status: 500,
    latencyMs: 1180,
    region: "us-east-1",
    user: { id: "usr_1002", role: "admin" },
    tags: ["payment", "critical"],
  },
  {
    serverId: "svr_03",
    endpoint: "/webhooks/stripe",
    status: 500,
    latencyMs: 940,
    region: "us-west-2",
    user: { id: "usr_1003", role: "system" },
    tags: ["webhook", "stripe", "critical"],
  },
];

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data, null, 2));
  }

  return data as T;
}

async function main(): Promise<void> {
  const contextResponse = await post<{
    data: { context: { contextId: string } };
  }>("/contexts", { documentContext });
  const { contextId } = contextResponse.data.context;

  console.log("Created context:", contextId);

  const analyzeResponse = await post(`/contexts/${contextId}/analyze`, {
    userQuery: "Find failed records and give recommendations.",
  });

  console.log(JSON.stringify(analyzeResponse, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
