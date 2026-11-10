# models/

Mongoose Schemas + Models: the persisted shape of every collection, plus any behavior that is intrinsically about *that data itself* (password hashing, comparison, serialization rules).

**Why this folder exists:** MongoDB is schemaless at the database level — this folder is where the application imposes structure, validation, and document-level behavior (via Mongoose hooks/instance methods) on top of that flexibility. It answers "what does a User/RefreshToken/etc. document look like, and what can it do to itself?"

**Why files belong here:** a file belongs here if it's a `mongoose.model(...)` definition. It should contain schema shape, indexes, hooks (pre/post save), and instance/static methods that operate purely on that document's own data (e.g. `comparePassword`). It should NOT contain multi-document business logic (that's a `services/` job) or query composition beyond the model's own basic CRUD (that's a `repositories/` job).

**How this scales:** as more entities appear (Project, Task, Comment, Notification), each gets its own `<Entity>.js` file here. Relationships between them are expressed via `Schema.Types.ObjectId` + `ref` (referencing) for independently-lived, queried-on-their-own entities, or nested subdocuments for data that only ever makes sense embedded in its parent (see `User.js` and `RefreshToken.js` docblocks for a worked example of that tradeoff).
