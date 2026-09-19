import { createAuth } from "@theinnerwar.app/auth";
import { createPrismaClient } from "@theinnerwar.app/db";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);
export const auth = createAuth(ENV, db);
