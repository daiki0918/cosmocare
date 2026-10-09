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
const chapelNames = new Set(Array.from({ length: 10 }, (_, index) => `Chapel ${index + 1}`));

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
    branch: { type: String, trim: true },
    chapelName: { type: String, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true },
);
userSchema.index(
  { type: 1, branch: 1, chapelName: 1 },
  { unique: true, partialFilterExpression: { type: "Chapel" } },
);

const requestSchema = new mongoose.Schema(
  {
    request: { type: String, required: true, trim: true },
    icon: { type: String, default: "other" },
    requestedBy: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    chapel: { type: String, required: true, trim: true },
    branch: { type: String, trim: true },
    chapelName: { type: String, trim: true },
  
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
    chapelName: { type: String, default: null },
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
  const branch = user.branch || user.chapel;
  const chapel = user.type === "Chapel" ? (user.chapelName || user.chapel) : branch;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    type: user.type,
    chapel,
    branch,
    chapelName: user.chapelName || (user.type === "Chapel" ? user.name : ""),
    status: user.status,
  };
}

function publicServiceOffer(service) {
  const icon = resolveServiceIcon(service.name, service.icon);
  return {
    id: service._id,
    name: service.name,
    description: service.description,
    tone: service.tone,
    icon,
    enabled: service.enabled,
  };
}

function resolveServiceIcon(name, icon = "other") {
  if (icon && icon !== "other") return icon;
  const label = String(name || "").toLowerCase();
  if (label.includes("staff")) return "staff";
  if (label.includes("chair")) return "chair";
  if (label.includes("water")) return "water";
  if (label.includes("coffee")) return "coffee";
  if (label.includes("food") || label.includes("meal")) return "food";
  if (label.includes("clean")) return "cleaning";
  if (label.includes("aircon") || label.includes("air con") || label.includes("temperature")) return "aircon";
  if (label.includes("restroom") || label.includes("bathroom")) return "restroom";
  if (label.includes("parking")) return "parking";
  if (label.includes("suppl")) return "supplies";
  if (label.includes("coordinator")) return "coordinator";
  
  return "other";
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
  const eventBranch = data.branch || data.chapel;
  for (const client of requestStreamClients) {
    const sameBranch = !eventBranch || (client.user.branch || client.user.chapel) === eventBranch;
    const sameChapel = !data.chapelName || !client.user.chapelName || client.user.chapelName === data.chapelName;
    if (client.user.type === "Admin" || (sameBranch && (client.user.type !== "Chapel" || sameChapel))) client.response.write(payload);
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
    const { name, email, password, type, branch, chapel, chapelName, status } = req.body;
    const assignedBranch = String(branch || chapel || "").trim();
    const assignedChapelName = String(chapelName || chapel || "").trim();
    if (!name || !email || !password || !type || !assignedBranch) {
      return res.status(400).json({ message: "Name, email, password, type, and branch are required." });
    }
    if (type === "Chapel" && !assignedChapelName) return res.status(400).json({ message: "A chapel name is required for chapel accounts." });
    if (type === "Chapel" && !chapelNames.has(assignedChapelName)) return res.status(400).json({ message: "Choose a chapel from Chapel 1 through Chapel 10." });
    if (type === "Chapel" && await User.exists({ type: "Chapel", branch: assignedBranch, chapelName: assignedChapelName })) {
      return res.status(409).json({ message: "That chapel already has an account in this branch." });
    }
    const credentials = createPassword(password);
    const user = await User.create({ name, email, type, chapel: type === "Chapel" ? assignedChapelName : assignedBranch, branch: assignedBranch, chapelName: assignedChapelName, status, ...credentials });
    await ActivityLog.create({ user: req.user.name, role: req.user.type, action: "Created account", detail: `${user.name} · ${user.type} · ${user.branch || user.chapel}`, tone: req.user.type.toLowerCase() });
    res.status(201).json(publicUser(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That email is already registered." });
    next(error);
  }
});

app.patch("/api/accounts/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ["name", "email", "type", "branch", "chapel", "chapelName", "status"];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (changes.branch) {
      changes.branch = String(changes.branch).trim();
    }
    if (changes.chapelName !== undefined) changes.chapelName = String(changes.chapelName).trim();
    if (changes.chapel !== undefined) changes.chapel = String(changes.chapel).trim();
    if (changes.type === "Chapel" && !String(changes.chapelName || "").trim()) {
      return res.status(400).json({ message: "A chapel name is required for chapel accounts." });
    }
    if (changes.type === "Chapel" && !chapelNames.has(String(changes.chapelName).trim())) {
      return res.status(400).json({ message: "Choose a chapel from Chapel 1 through Chapel 10." });
    }
    const current = await User.findById(req.params.id);
    if (!current) return res.status(404).json({ message: "Account not found." });
    const nextType = changes.type || current.type;
    const nextBranch = changes.branch || changes.chapel || current.branch || current.chapel;
    const nextChapelName = changes.chapelName || changes.chapel || current.chapelName;
    if (nextType === "Chapel" && changes.chapelName !== undefined && !chapelNames.has(String(nextChapelName || "").trim())) {
      return res.status(400).json({ message: "Choose a chapel from Chapel 1 through Chapel 10." });
    }
    if (nextType === "Chapel" && await User.exists({ _id: { $ne: req.params.id }, type: "Chapel", branch: nextBranch, chapelName: nextChapelName })) {
      return res.status(409).json({ message: "That chapel already has an account in this branch." });
    }
    if (nextType === "Chapel") {
      changes.branch = nextBranch;
      changes.chapel = nextChapelName;
      changes.chapelName = nextChapelName;
    } else if (changes.branch) {
      changes.chapel = nextBranch;
    }
    if (req.body.password) Object.assign(changes, createPassword(String(req.body.password)));
    const user = await User.findByIdAndUpdate(req.params.id, changes, { returnDocument: "after", runValidators: true });
    await ActivityLog.create({ user: req.user.name, role: req.user.type, action: "Updated account", detail: `${user.name} · ${user.type} · ${user.branch || user.chapel}`, tone: req.user.type.toLowerCase() });
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
    const service = await ServiceOffer.findByIdAndUpdate(req.params.id, changes, { returnDocument: "after", runValidators: true });
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
    if (req.user.type === "Chapel") {
      filter.$or = [{ branch: req.user.branch || req.user.chapel, chapel: req.user.chapel }];
    } else if (req.user.type === "Staff") {
      filter.$or = [{ branch: req.user.branch || req.user.chapel }, { branch: { $exists: false }, chapel: req.user.branch || req.user.chapel }];
    }
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
    const { request, icon = "other", requestedBy, location, details = "" } = req.body;
    if (!request || !requestedBy || !location) {
      return res.status(400).json({ message: "Request, requester, and location are required." });
    }
    const created = await ServiceRequest.create({
      request,
      icon: resolveServiceIcon(request, icon),
      requestedBy,
      chapel: req.user.chapelName || req.user.chapel,
      branch: req.user.branch || req.user.chapel,
      chapelName: req.user.chapelName || req.user.name,
      location,
      details,
      createdBy: req.user._id,
    });
    const populated = await created.populate("createdBy", "name email chapel");
    const notification = await Notification.create({
      recipient: "staff",
      branch: req.user.branch || req.user.chapel,
      chapelName: req.user.chapelName || req.user.name,
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
    const requestFilter = req.user.type === "Admin"
      ? { _id: req.params.id }
      : { _id: req.params.id, $or: [{ branch: req.user.branch || req.user.chapel }, { branch: { $exists: false }, chapel: req.user.branch || req.user.chapel }] };
    const updated = await ServiceRequest.findOneAndUpdate(requestFilter, changes, { returnDocument: "after", runValidators: true });
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
      { returnDocument: "after" },
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
    const branch = req.user.branch || req.user.chapel;
    const filter = req.user.type === "Admin"
      ? { recipient }
      : req.user.type === "Chapel"
        ? { recipient, $or: [{ branch, chapelName: req.user.chapelName }, { branch: null }, { branch: { $exists: false } }] }
        : { recipient, $or: [{ branch }, { branch: null }, { branch: { $exists: false } }] };
    res.json(await Notification.find(filter).sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/notifications", authenticate, async (req, res, next) => {
  try {
    const recipient = req.user.type === "Admin" ? "staff" : "admin";
    const { title, message, branch = null, chapelName = null } = req.body;
    if (!title || !message) return res.status(400).json({ message: "Title and message are required." });
    const notification = await Notification.create({
      recipient,
      sender: req.user.name,
      title,
      message,
      branch: recipient === "staff" ? branch : null,
      chapelName: recipient === "staff" ? chapelName : null,
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
    const notificationFilter = req.user.type === "Admin"
      ? { _id: req.params.id, recipient }
      : req.user.type === "Chapel"
        ? { _id: req.params.id, recipient, $or: [{ branch: req.user.branch || req.user.chapel, chapelName: req.user.chapelName }, { branch: null }, { branch: { $exists: false } }] }
        : { _id: req.params.id, recipient, $or: [{ branch: req.user.branch || req.user.chapel }, { branch: null }, { branch: { $exists: false } }] };
    const notification = await Notification.findOneAndUpdate(
      notificationFilter,
      { read: true },
      { returnDocument: "after" },
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

  // Create the initial administrator if none exists
  const hasAdmin = await User.exists({ type: "Admin" });

  if (
    !hasAdmin &&
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD
  ) {
    const admin = await User.create({
      name: process.env.ADMIN_NAME || "System Administrator",
      email: process.env.ADMIN_EMAIL,
      type: "Admin",
      chapel: process.env.ADMIN_CHAPEL || "Administration",
      status: "Active",
      ...createPassword(process.env.ADMIN_PASSWORD),
    });

    console.log(`Initial administrator created: ${admin.email}`);
  } else if (!hasAdmin) {
    console.warn(
      "No administrator account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the initial administrator."
    );
  }

  // Update existing users' branch fields
  await User.updateMany(
    { branch: { $exists: false } },
    [{ $set: { branch: "$chapel" } }],
    { updatePipeline: true }
  );

  // Update existing chapel users' chapelName fields
  await User.updateMany(
    { type: "Chapel", chapelName: { $exists: false } },
    [{ $set: { chapelName: "$name" } }],
    { updatePipeline: true }
  );

  const chapelUsers = await User.find({ type: "Chapel" }).sort({
    createdAt: 1,
  });

  const assignedChapels = new Set();

  for (const user of chapelUsers) {
    const branch = user.branch || user.chapel;

    const currentChapel = chapelNames.has(user.chapelName)
      ? user.chapelName
      : "";

    const availableChapel =
      currentChapel &&
      !assignedChapels.has(`${branch}:${currentChapel}`)
        ? currentChapel
        : Array.from(chapelNames).find(
            (chapel) => !assignedChapels.has(`${branch}:${chapel}`)
          );

    if (!availableChapel) {
      console.warn(
        `No available chapel assignment for ${user.email} in ${branch}`
      );
      continue;
    }

    assignedChapels.add(`${branch}:${availableChapel}`);

    if (
      user.branch !== branch ||
      user.chapel !== availableChapel ||
      user.chapelName !== availableChapel
    ) {
      user.branch = branch;
      user.chapel = availableChapel;
      user.chapelName = availableChapel;
      await user.save();
    }
  }

  // Update service requests
  await ServiceRequest.updateMany(
    { branch: { $exists: false } },
    [{ $set: { branch: "$chapel" } }],
    { updatePipeline: true }
  );

  // Remove the old room field
  await ServiceRequest.updateMany(
    { room: { $exists: true } },
    { $unset: { room: 1 } }
  );

  // Insert default service offers if none exist
  if ((await ServiceOffer.countDocuments()) === 0) {
    await ServiceOffer.insertMany(defaultServiceOffers);
    console.log("Default service offers created");
  }

  // Start the server
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}



start().catch((error) => {
  console.error("MongoDB connection failed:", error);
  process.exitCode = 1;
});
