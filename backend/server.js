const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const sessions = new Map();
const requestStreamClients = new Set();

app.use(cors());
app.use(express.json());

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    type: { type: String, enum: ["Admin", "Staff", "Chapel"], required: true },
    chapel: { type: String, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true },
);

const requestSchema = new mongoose.Schema(
  {
    request: { type: String, required: true, trim: true },
    requestedBy: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    chapel: { type: String, required: true, trim: true },
  
    details: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["Pending", "In progress", "Completed"], default: "Pending" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
const ServiceRequest = mongoose.model("ServiceRequest", requestSchema);
const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: String, enum: ["admin", "staff"], required: true },
    branch: { type: String, default: null },
    sender: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);
const Notification = mongoose.model("Notification", notificationSchema);
const activityLogSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    detail: { type: String, required: true },
    tone: { type: String, default: "admin" },
  },
  { timestamps: true },
);
const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
const serviceOfferSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    tone: { type: String, enum: ["violet", "gold", "blue", "green"], default: "violet" },
    icon: { type: String, default: "other" },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const ServiceOffer = mongoose.model("ServiceOffer", serviceOfferSchema);

const defaultServiceOffers = [
  ["Call Staff", "Someone will come to you", "violet", "staff"],
  ["Request Chairs", "Extra seating", "gold", "chair"],
  ["Request Water", "Drinking water", "blue", "water"],
  ["Request Coffee", "Refreshments", "violet", "coffee"],
  ["Request Food", "Meal assistance", "gold", "food"],
  ["Request Cleaning", "Tidy the area", "green", "cleaning"],
  ["Adjust Aircon", "Change the temperature", "blue", "aircon"],
  ["Restroom Assistance", "Help finding the restroom", "green", "restroom"],
  ["Parking Assistance", "Help with parking", "violet", "parking"],
  ["Request Supplies", "Need additional items", "gold", "supplies"],
  ["Contact Funeral Coordinator", "Speak with the coordinator", "blue", "coordinator"],
  ["Other Request", "Tell us what you need", "violet", "other"],
].map(([name, description, tone, icon]) => ({ name, description, tone, icon, enabled: true }));

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function createPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { passwordSalt: salt, passwordHash: hashPassword(password, salt) };
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    type: user.type,
    chapel: user.chapel,
    status: user.status,
  };
}

function publicServiceOffer(service) {
  return {
    id: service._id,
    name: service.name,
    description: service.description,
    tone: service.tone,
    icon: service.icon,
    enabled: service.enabled,
  };
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const userId = token && sessions.get(token);
  if (!userId) return res.status(401).json({ message: "Authentication required." });
  User.findById(userId)
    .then((user) => {
      if (!user || user.status !== "Active") return res.status(401).json({ message: "Account is inactive." });
      req.user = user;
      next();
    })
    .catch(next);
}

function broadcastRequestEvent(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of requestStreamClients) {
    if (client.user.type === "Admin" || event !== "notification-created" || !data.branch || client.user.chapel === data.branch) client.response.write(payload);
  }
}

function requireAdmin(req, res, next) {
  if (req.user.type !== "Admin") return res.status(403).json({ message: "Administrator access required." });
  next();
}

app.get("/", (req, res) => {
  if (fs.existsSync(path.resolve(__dirname, "../frontend/dist/index.html"))) {
    return res.sendFile(path.resolve(__dirname, "../frontend/dist/index.html"));
  }
  res.json({
    message: "CosmoCare Backend is running",
    mongodb: "Connected",
  });
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email });
    if (!user || user.status !== "Active" || !crypto.timingSafeEqual(
      Buffer.from(hashPassword(password, user.passwordSalt), "hex"),
      Buffer.from(user.passwordHash, "hex"),
    )) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const token = crypto.randomUUID();
    sessions.set(token, user._id.toString());
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/accounts", authenticate, requireAdmin, async (req, res, next) => {
  try {
    res.json((await User.find().sort({ createdAt: 1 })).map(publicUser));
  } catch (error) {
    next(error);
  }
});

app.get("/api/activity-logs", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs.map((log) => ({ ...log.toObject(), id: log._id, time: new Date(log.createdAt).toLocaleString() })));
  } catch (error) {
    next(error);
  }
});

app.post("/api/accounts", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password, type, chapel, status } = req.body;
    if (!name || !email || !password || !type || !chapel) {
      return res.status(400).json({ message: "Name, email, password, type, and chapel are required." });
    }
    const credentials = createPassword(password);
    const user = await User.create({ name, email, type, chapel, status, ...credentials });
    await ActivityLog.create({ user: req.user.name, role: req.user.type, action: "Created account", detail: `${user.name} · ${user.type} · ${user.chapel}`, tone: req.user.type.toLowerCase() });
    res.status(201).json(publicUser(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That email is already registered." });
    next(error);
  }
});

app.patch("/api/accounts/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ["name", "email", "type", "chapel", "status"];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (req.body.password) Object.assign(changes, createPassword(String(req.body.password)));
    const user = await User.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: "Account not found." });
    await ActivityLog.create({ user: req.user.name, role: req.user.type, action: "Updated account", detail: `${user.name} · ${user.type} · ${user.chapel}`, tone: req.user.type.toLowerCase() });
    res.json(publicUser(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That email is already registered." });
    next(error);
  }
});

app.delete("/api/accounts/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: "You cannot delete your own account." });
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Account not found." });
    await ActivityLog.create({ user: req.user.name, role: req.user.type, action: "Deleted account", detail: `${deleted.name} · ${deleted.email}`, tone: req.user.type.toLowerCase() });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/services", authenticate, async (req, res, next) => {
  try {
    const filter = req.user.type === "Chapel" ? { enabled: true } : {};
    res.json((await ServiceOffer.find(filter).sort({ createdAt: 1 })).map(publicServiceOffer));
  } catch (error) {
    next(error);
  }
});

app.post("/api/services", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, tone = "violet", icon = "other", enabled = true } = req.body;
    if (!name || !description) return res.status(400).json({ message: "Service name and description are required." });
    const service = await ServiceOffer.create({ name, description, tone, icon, enabled });
    res.status(201).json(publicServiceOffer(service));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/services/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ["name", "description", "tone", "icon", "enabled"];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const service = await ServiceOffer.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ message: "Service offer not found." });
    res.json(publicServiceOffer(service));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/services/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const deleted = await ServiceOffer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Service offer not found." });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/requests", authenticate, async (req, res, next) => {
  try {
    if (req.query.deleted === "true" && req.user.type !== "Admin") {
      return res.status(403).json({ message: "Only administrators can view deleted requests." });
    }
    const filter = req.query.deleted === "true" ? { deletedAt: { $exists: true, $ne: null } } : { deletedAt: null };
    if (["Chapel", "Staff"].includes(req.user.type)) filter.chapel = req.user.chapel;
    res.json(await ServiceRequest.find(filter).populate("createdBy", "name email chapel").sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
});

app.get("/api/requests/stream", async (req, res) => {
  const userId = sessions.get(req.query.token);
  const user = userId && await User.findById(userId);
  if (!user || user.status !== "Active" || !["Admin", "Staff"].includes(user.type)) {
    return res.status(401).end();
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("event: connected\ndata: {}\n\n");
  const client = { response: res, user };
  requestStreamClients.add(client);
  req.on("close", () => requestStreamClients.delete(client));
});

app.post("/api/requests", authenticate, async (req, res, next) => {
  try {
    if (req.user.type !== "Chapel") return res.status(403).json({ message: "Only chapel accounts can create requests." });
    const { request, requestedBy, location, details = "" } = req.body;
    if (!request || !requestedBy || !location) {
      return res.status(400).json({ message: "Request, requester, and location are required." });
    }
    const created = await ServiceRequest.create({
      request,
      requestedBy,
      chapel: req.user.chapel,
      location,
      details,
      createdBy: req.user._id,
    });
    const populated = await created.populate("createdBy", "name email chapel");
    const notification = await Notification.create({
      recipient: "staff",
      branch: req.user.chapel,
      sender: req.user.name,
      title: "New customer request",
      message: `${request} requested by ${requestedBy} at ${location}.`,
    });
    broadcastRequestEvent("request-created", populated);
    broadcastRequestEvent("notification-created", notification);
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/requests/:id", authenticate, async (req, res, next) => {
  try {
    if (!["Admin", "Staff"].includes(req.user.type)) return res.status(403).json({ message: "Staff access required." });
    const allowed = ["status"];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const updated = await ServiceRequest.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Request not found." });
    const populated = await updated.populate("createdBy", "name email chapel");
    await ActivityLog.create({ user: req.user.name, role: req.user.type, action: "Updated request", detail: `${populated.request} · status changed to ${populated.status}`, tone: req.user.type.toLowerCase() });
    broadcastRequestEvent("request-updated", populated);
    res.json(populated);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/requests/:id", authenticate, async (req, res, next) => {
  try {
    if (req.user.type !== "Admin") return res.status(403).json({ message: "Only administrators can delete requests." });
    const deleted = await ServiceRequest.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), deletedBy: req.user._id },
      { new: true },
    ).populate("createdBy", "name email chapel");
    if (!deleted) return res.status(404).json({ message: "Active request not found." });
    await ActivityLog.create({ user: req.user.name, role: req.user.type, action: "Moved request to Deleted", detail: `${deleted.request} · ${deleted.chapel}`, tone: req.user.type.toLowerCase() });
    broadcastRequestEvent("request-deleted", deleted);
    res.json(deleted);
  } catch (error) {
    next(error);
  }
});

app.get("/api/notifications", authenticate, async (req, res, next) => {
  try {
    const recipient = req.user.type === "Admin" ? "admin" : "staff";
    const filter = req.user.type === "Admin" ? { recipient } : { recipient, $or: [{ branch: req.user.chapel }, { branch: null }, { branch: { $exists: false } }] };
    res.json(await Notification.find(filter).sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/notifications", authenticate, async (req, res, next) => {
  try {
    const recipient = req.user.type === "Admin" ? "staff" : "admin";
    const { title, message, branch = null } = req.body;
    if (!title || !message) return res.status(400).json({ message: "Title and message are required." });
    const notification = await Notification.create({
      recipient,
      sender: req.user.name,
      title,
      message,
      branch: recipient === "staff" ? branch : null,
    });
    broadcastRequestEvent("notification-created", notification);
    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/notifications/:id/read", authenticate, async (req, res, next) => {
  try {
    const recipient = req.user.type === "Admin" ? "admin" : "staff";
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient },
      { read: true },
      { new: true },
    );
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    res.json(notification);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error("API error:", error);
  res.status(500).json({ message: "The server could not complete the request." });
});

const frontendDist = path.resolve(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) {
      return res.sendFile(path.join(frontendDist, "index.html"));
    }
    next();
  });
}

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected successfully");
  await ServiceRequest.updateMany({ room: { $exists: true } }, { $unset: { room: 1 } });
  if (await ServiceOffer.countDocuments() === 0) {
    await ServiceOffer.insertMany(defaultServiceOffers);
    console.log("Default service offers created");
  }

  app.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));
}

start().catch((error) => {
  console.error("MongoDB connection failed:", error);
  process.exitCode = 1;
});
