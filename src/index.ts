#!/usr/bin/env node
import { Command } from "commander";
import { loginCommand } from "./commands/auth/login.js";
import { logoutCommand } from "./commands/auth/logout.js";
import { statusCommand } from "./commands/auth/status.js";
import { tokenCommand } from "./commands/auth/token.js";
import { configCommand } from "./commands/config.js";
import { listProjectsCommand } from "./commands/project/list.js";
import { viewProjectCommand } from "./commands/project/view.js";
import { listStatesCommand } from "./commands/state/list.js";
import { listLabelsCommand } from "./commands/label/list.js";
import { listMembersCommand } from "./commands/member/list.js";
import { listWorkItemsCommand } from "./commands/work-item/list.js";
import { viewWorkItemCommand } from "./commands/work-item/view.js";
import { createWorkItemCommand } from "./commands/work-item/create.js";
import { updateWorkItemCommand } from "./commands/work-item/update.js";
import { deleteWorkItemCommand } from "./commands/work-item/delete.js";
import { listCommentsCommand } from "./commands/work-item/comment/list.js";
import { addCommentCommand } from "./commands/work-item/comment/add.js";

const program = new Command();
program
  .name("plane")
  .description("CLI for Plane.so project tracker")
  .version("0.1.0");

// Auth
const auth = program.command("auth").description("Manage authentication");
auth.addCommand(loginCommand);
auth.addCommand(logoutCommand);
auth.addCommand(statusCommand);
auth.addCommand(tokenCommand);

// Config
program.addCommand(configCommand);

// Projects
const project = program.command("project").alias("p").description("Manage projects");
project.addCommand(listProjectsCommand);
project.addCommand(viewProjectCommand);

// States
const state = program.command("state").alias("s").description("Manage states");
state.addCommand(listStatesCommand);

// Labels
const label = program.command("label").alias("l").description("Manage labels");
label.addCommand(listLabelsCommand);

// Members
const member = program.command("member").alias("m").description("Manage members");
member.addCommand(listMembersCommand);

// Work Items
const workItem = program.command("work-item").alias("wi").description("Manage work items");
workItem.addCommand(listWorkItemsCommand);
workItem.addCommand(viewWorkItemCommand);
workItem.addCommand(createWorkItemCommand);
workItem.addCommand(updateWorkItemCommand);
workItem.addCommand(deleteWorkItemCommand);

const comment = workItem.command("comment").description("Manage work item comments");
comment.addCommand(listCommentsCommand);
comment.addCommand(addCommentCommand);

program.parse();
