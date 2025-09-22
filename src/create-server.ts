import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const API_BASE = `${process.env.API_BASE_URL}`;
const USER_AGENT = "pc-power-app/1.0";

async function makeRequest<T>(url: string, type: 'GET' | 'POST'): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    "Authorization": `${process.env.AUTHORIZATION_HEADER}`,
    Accept: "application/json, text/plain, */*",
    method: type,
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.text()) as T;
  } catch (error) {
    console.error("Error making NWS request:", error);
    return null;
  }
}

export const createServer = () => {
  const server = new McpServer({
    name: "pc-power",
    version: "1.0.0",
  });

  // Register status tool
  server.tool(
    "get-pc-power-status",
    "Get user's PC power status",
    async () => {
      const statusUrl = `${API_BASE}/state`;
      const statusData = await makeRequest<string>(statusUrl, 'GET');

      if (!statusData) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve status data, maybe ESP is offline.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: "PC is currently: " + statusData,
          },
        ],
      };
    }
  );

  // Register on tool
  server.tool(
    "turn-pc-on",
    "Turn user's PC on",
    async () => {
      const powerUrl = `${API_BASE}/on`;
      const powerData = await makeRequest<string>(powerUrl, 'POST');

      if (!powerData) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve power data, maybe ESP is offline.",
            },
          ],
        };
      }
      if (powerData === "OK") {
        return {
          content: [
            {
              type: "text",
              text: "PC is now turning on!",
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "Failed to turn on the PC, maybe it's already on or ESP is offline.",
            },
          ],
        };
      }
    }
  );

  // Register off tool
  server.tool(
    "turn-pc-off",
    "Turn user's PC off",
    async () => {
      const powerUrl = `${API_BASE}/off`;
      const powerData = await makeRequest<string>(powerUrl, 'POST');

      if (!powerData) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve power data, maybe ESP is offline.",
            },
          ],
        };
      }
      if (powerData === "OK") {
        return {
          content: [
            {
              type: "text",
              text: "PC is now turning off!",
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "Failed to turn off the PC, maybe it's already off or ESP is offline.",
            },
          ],
        };
      }
    }
  );

  // Register force off tool
  server.tool(
    "force-pc-off",
    "Force user's PC off - Dangerous",
    async () => {
      const powerUrl = `${API_BASE}/foff`;
      const powerData = await makeRequest<string>(powerUrl, 'POST');

      if (!powerData) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve power data, maybe ESP is offline.",
            },
          ],
        };
      }
      if (powerData === "OK") {
        return {
          content: [
            {
              type: "text",
              text: "PC is now forcing turning off!",
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "Failed to force off the PC, maybe it's already off or ESP is offline.",
            },
          ],
        };
      }
    }
  );

  return { server };
};
