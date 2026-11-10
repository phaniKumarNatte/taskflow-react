# routes/

URL + HTTP verb → middleware chain → controller mappings. No logic — pure wiring.

**Why this folder exists:** separating "what URL triggers what" from "what actually happens" (controllers/services) means the API's whole surface area can be read top-to-bottom from this folder alone, without wading through implementation details.

**Why files belong here:** a file belongs here if it's an `express.Router()` composing validators/middleware/controllers for one feature's endpoints. `index.js` is the exception — it aggregates every feature router and is the only file `app.js` imports from this folder.

**How this scales:** one `<feature>.routes.js` per feature, one new line in `index.js` per feature added — see `index.js`'s docblock for why that indirection (a Facade over the growing list of feature routers) matters once there are more than a couple of features.
