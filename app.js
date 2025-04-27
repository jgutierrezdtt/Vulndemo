import { useState } from "react";
import express from "express";
import cors from "cors";
import { Button, Input, Card, CardContent } from "@/components/ui";

const app = express();
app.use(cors());

app.get("/api/forward-port", (req, res) => {
  const { port } = req.query;
  if (!port) {
    return res.status(400).json({ error: "Port is required" });
  }

  // Simulación de URL pública generada
  const publicUrl = `https://my-forwarded-app-${port}.example.com`;

  res.json({ url: publicUrl });
});

const SERVER_PORT = 5000;
app.listen(SERVER_PORT, () => {
  console.log(`Server running on http://localhost:${SERVER_PORT}`);
});

export default function PortForwardingApp() {
  const [port, setPort] = useState(3000);
  const [publicUrl, setPublicUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForwardPort = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:${SERVER_PORT}/api/forward-port?port=${port}`);
      const data = await response.json();
      setPublicUrl(data.url);
    } catch (error) {
      console.error("Error forwarding port:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <Card>
        <CardContent>
          <h2 className="text-xl font-bold mb-4">VS Code Port Forwarding</h2>
          <Input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="Enter port number"
            className="mb-4"
          />
          <Button onClick={handleForwardPort} disabled={loading}>
            {loading ? "Forwarding..." : "Forward Port"}
          </Button>
          {publicUrl && (
            <p className="mt-4 text-green-600">Public URL: <a href={publicUrl} target="_blank" className="underline">{publicUrl}</a></p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
