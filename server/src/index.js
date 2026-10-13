/* HaniaFlight multiplayer room server.
   One Durable Object per room code. Players connect with a WebSocket to /room/CODE?name=...
   The room only passes messages along: WebRTC connection setup between the players, and the game
   itself for players whose direct connection could not be made. It uses the hibernation API, so an
   idle room costs nothing, and it never stores anything. */
import { DurableObject } from "cloudflare:workers";

const MAX_PLAYERS = 4;
const MAX_MSG = 16 * 1024;
const cors = { "access-control-allow-origin": "*" };

export class Room extends DurableObject {
  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected a websocket", { status: 426, headers: cors });
    const url = new URL(req.url);
    const name = (url.searchParams.get("name") || "").slice(0, 18);
    const others = this.ctx.getWebSockets().map(w => w.deserializeAttachment()).filter(Boolean);
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    if (others.length >= MAX_PLAYERS) {
      server.send(JSON.stringify({ t: "full" }));
      server.close(4001, "room full");
      return new Response(null, { status: 101, webSocket: client });
    }
    const me = { id: crypto.randomUUID().slice(0, 8), name, host: !others.some(o => o.host) };
    server.serializeAttachment(me);
    server.send(JSON.stringify({ t: "hello", id: me.id, host: me.host, peers: others }));
    this.broadcast(server, JSON.stringify({ t: "join", peer: me }));
    return new Response(null, { status: 101, webSocket: client });
  }
  broadcast(from, text, to) {
    for (const w of this.ctx.getWebSockets()) {
      if (w === from) continue;
      const a = w.deserializeAttachment();
      if (!a || (to && a.id !== to)) continue;
      try { w.send(text); } catch (e) {}
    }
  }
  webSocketMessage(ws, msg) {
    if (typeof msg !== "string" || msg.length > MAX_MSG) return;
    const me = ws.deserializeAttachment();
    if (!me) return;
    let o;
    try { o = JSON.parse(msg); } catch (e) { return; }
    if (!o || typeof o !== "object") return;
    o.from = me.id;
    this.broadcast(ws, JSON.stringify(o), typeof o.to === "string" ? o.to : null);
  }
  webSocketClose(ws, code) {
    const me = ws.deserializeAttachment();
    if (me) this.broadcast(ws, JSON.stringify({ t: "leave", id: me.id, host: me.host }));
    ws.serializeAttachment(null);
    try { ws.close(1000, "bye"); } catch (e) {}
  }
  webSocketError(ws) { this.webSocketClose(ws, 1011); }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "/health") return new Response("haniaflight-mp ok", { headers: cors });
    const m = url.pathname.match(/^\/room\/([A-Z0-9]{4,8})$/);
    if (!m) return new Response("not found", { status: 404, headers: cors });
    return env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(req);
  },
};
